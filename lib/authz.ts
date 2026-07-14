/**
 * Authorization / scoping helpers.
 *
 * Shippers and carriers log into their own scoped views (acceptance criteria).
 * These helpers turn a verified session into resource-level guards so a shipper
 * can never read/act on another shipper's loads, and a carrier only sees loads
 * relevant to it. Comparable to rjs-platform `lib/authz.ts`.
 */

import type { SessionClaims } from './session.ts';
import type { Carrier, Load, UserRole, VettingStatus } from './types.ts';

export class AuthzError extends Error {
  readonly status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.name = 'AuthzError';
    this.status = status;
  }
}

/** Require an authenticated principal, throwing 401 otherwise. */
export function requireSession(claims: SessionClaims | null | undefined): SessionClaims {
  if (!claims) throw new AuthzError('authentication required', 401);
  return claims;
}

/** Require a specific role, throwing 403 on mismatch. */
export function requireRole(claims: SessionClaims | null | undefined, role: UserRole): SessionClaims {
  const s = requireSession(claims);
  if (s.role !== role) throw new AuthzError(`requires ${role} role`, 403);
  return s;
}

/**
 * Whether a principal may view a load.
 * - Shipper: only its own loads.
 * - Carrier: the assigned carrier, or any load still open for acceptance
 *   (no carrier assigned yet) so it can appear on the carrier board.
 */
export function canViewLoad(claims: SessionClaims, load: Load): boolean {
  if (claims.role === 'shipper') return load.shipperId === claims.sub;
  // carrier
  return load.carrierId === claims.sub || load.carrierId === undefined;
}

/** Whether a principal may mutate/act on a load (stricter than view). */
export function canActOnLoad(claims: SessionClaims, load: Load): boolean {
  if (claims.role === 'shipper') return load.shipperId === claims.sub;
  return load.carrierId === claims.sub || load.carrierId === undefined;
}

/** Filter a list of loads down to the ones this principal may see. */
export function scopeLoads(claims: SessionClaims, loads: readonly Load[]): Load[] {
  return loads.filter((l) => canViewLoad(claims, l));
}

/**
 * A carrier may only accept loads once it has cleared vetting.
 * Gates the accept endpoint behind `vetting_status === 'approved'`.
 */
export function canCarrierAcceptLoads(carrier: Pick<Carrier, 'vettingStatus'>): boolean {
  return carrier.vettingStatus === 'approved';
}

/** Throwing variant used at the accept endpoint boundary. */
export function assertCarrierMayAccept(carrier: Pick<Carrier, 'vettingStatus'>): void {
  if (!canCarrierAcceptLoads(carrier)) {
    const status: VettingStatus = carrier.vettingStatus;
    throw new AuthzError(`carrier not eligible to accept loads (vetting: ${status})`, 403);
  }
}
