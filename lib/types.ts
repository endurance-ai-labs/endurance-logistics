/**
 * Shared domain types for the Endurance `foundations` marketplace.
 *
 * These are intentionally framework-agnostic so they can be consumed by the
 * Next.js app (Tasks 1–9), the ingestion CLI, and the test suite alike. The
 * data layer is owned by this repo — there is no shared DB with rjs-platform.
 */

/** The two first-class user types on the marketplace. */
export type UserRole = 'shipper' | 'carrier';

/**
 * Carrier vetting outcome, fed by the FMCSA/DOT lookup hook.
 * Ordering matters for gating: only `approved` carriers can accept loads.
 */
export type VettingStatus = 'pending' | 'in_review' | 'approved' | 'rejected';

export const VETTING_STATUSES: readonly VettingStatus[] = [
  'pending',
  'in_review',
  'approved',
  'rejected',
] as const;

/** A shipper account (the demand side). */
export interface Shipper {
  id: string;
  /** Natural key from the McLeod export (customer id). */
  mcleodCustomerId: string;
  name: string;
  email: string;
  phone?: string;
  billingAddress?: string;
  onboardedAt: string; // ISO-8601
  source: 'seed' | 'mcleod' | 'signup';
}

/** A carrier account (the supply side). */
export interface Carrier {
  id: string;
  /** Natural key: DOT number is the canonical FMCSA identifier. */
  dotNumber: string;
  /** MC/docket number when present. */
  mcNumber?: string;
  legalName: string;
  dbaName?: string;
  email: string;
  phone?: string;
  vettingStatus: VettingStatus;
  /** Last time the FMCSA/DOT lookup ran, if ever. */
  vettedAt?: string;
  onboardedAt: string;
  source: 'seed' | 'mcleod' | 'signup';
}

/** A load moving through the marketplace lifecycle. */
export interface Load {
  id: string;
  shipperId: string;
  /** Assigned once a carrier accepts. */
  carrierId?: string;
  status: LoadStatus;
  origin: string;
  destination: string;
}

export type LoadStatus =
  | 'quoted'
  | 'confirmed'
  | 'carrier_accepted'
  | 'in_transit'
  | 'delivered';

/** The three key transitions that trigger notifications (per acceptance criteria). */
export type NotifiableTransition = 'confirmation' | 'carrier_accepted' | 'delivered';
