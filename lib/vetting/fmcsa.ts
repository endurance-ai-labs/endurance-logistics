/**
 * Carrier vetting hook — FMCSA / DOT lookup feeding `vetting_status`.
 *
 * The lookup itself lives behind an interface so we can swap the live FMCSA
 * SAFER / QCMobile API for a deterministic stub in tests and local dev. The
 * mapping from raw FMCSA safety data to our `VettingStatus` is pure and
 * unit-tested — it is the piece that carries compliance risk.
 */

import type { VettingStatus } from '../types.ts';

/** Normalized subset of the FMCSA carrier snapshot we care about. */
export interface FmcsaSnapshot {
  dotNumber: string;
  legalName?: string;
  /** Operating authority status. */
  allowedToOperate: boolean;
  /** FMCSA out-of-service order in effect. */
  outOfService: boolean;
  /** Whether required insurance (BIPD) is on file. */
  insuranceOnFile: boolean;
  /** e.g. "AUTHORIZED FOR Property" / "NOT AUTHORIZED". */
  operatingStatus?: string;
}

/** The lookup port. Implementations may hit the network or return fixtures. */
export interface FmcsaClient {
  /** Returns null when FMCSA has no record for the DOT number. */
  lookup(dotNumber: string): Promise<FmcsaSnapshot | null>;
}

export interface VettingDecision {
  status: VettingStatus;
  /** Human-readable justification, surfaced to ops. */
  reasons: string[];
  snapshot: FmcsaSnapshot | null;
}

/**
 * Pure mapping from an FMCSA snapshot to a vetting decision.
 * Kept separate from I/O so it can be exhaustively unit-tested.
 */
export function decideVetting(snapshot: FmcsaSnapshot | null): VettingDecision {
  const reasons: string[] = [];
  if (!snapshot) {
    return { status: 'rejected', reasons: ['no FMCSA record for DOT number'], snapshot: null };
  }

  // Hard rejections.
  if (snapshot.outOfService) reasons.push('FMCSA out-of-service order in effect');
  if (!snapshot.allowedToOperate) reasons.push('not allowed to operate');
  if (reasons.length > 0) {
    return { status: 'rejected', reasons, snapshot };
  }

  // Needs human review when authority is fine but insurance is unverified.
  if (!snapshot.insuranceOnFile) {
    return {
      status: 'in_review',
      reasons: ['insurance not on file — manual review required'],
      snapshot,
    };
  }

  return { status: 'approved', reasons: ['active authority, insurance on file'], snapshot };
}

/**
 * Run the vetting hook end-to-end: look up the carrier and map the result.
 * Network failures degrade to `in_review` (fail closed to human ops) rather
 * than throwing, so onboarding never hard-fails on an FMCSA outage.
 */
export async function vetCarrier(dotNumber: string, client: FmcsaClient): Promise<VettingDecision> {
  if (!dotNumber || !/^\d+$/.test(dotNumber)) {
    return { status: 'rejected', reasons: ['invalid DOT number'], snapshot: null };
  }
  try {
    const snapshot = await client.lookup(dotNumber);
    return decideVetting(snapshot);
  } catch (err) {
    return {
      status: 'in_review',
      reasons: [`FMCSA lookup failed: ${(err as Error).message}`],
      snapshot: null,
    };
  }
}

/**
 * A deterministic FMCSA client backed by an in-memory fixture map, keyed by DOT
 * number. Used by the seed importer, local dev, and tests. Unknown DOT numbers
 * resolve to `null` (no record).
 */
export class StubFmcsaClient implements FmcsaClient {
  constructor(private readonly fixtures: Record<string, FmcsaSnapshot> = {}) {}

  async lookup(dotNumber: string): Promise<FmcsaSnapshot | null> {
    return this.fixtures[dotNumber] ?? null;
  }

  /** Convenience for tests/seed to register a snapshot. */
  set(snapshot: FmcsaSnapshot): void {
    this.fixtures[snapshot.dotNumber] = snapshot;
  }
}
