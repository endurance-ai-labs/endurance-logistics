/**
 * Quote + booking domain types for the shipper flow.
 *
 * Framework-agnostic (no React / Next imports) so the pricing engine, the API
 * route handlers, and the unit tests all share one source of truth — the same
 * pattern the Phase 3 `lib/` modules follow. Composes with the shared
 * `LoadStatus` from `../types.ts`; there is no separate DB.
 */

import type { LoadStatus } from '../types.ts';

/** Trailer / equipment types a shipper can request an instant quote for. */
export type EquipmentType = 'dry_van' | 'reefer' | 'flatbed' | 'power_only';

export const EQUIPMENT_TYPES: readonly EquipmentType[] = [
  'dry_van',
  'reefer',
  'flatbed',
  'power_only',
] as const;

/** Human-facing labels for the equipment selector. */
export const EQUIPMENT_LABELS: Record<EquipmentType, string> = {
  dry_van: 'Dry van',
  reefer: 'Reefer',
  flatbed: 'Flatbed',
  power_only: 'Power only',
};

export function isEquipmentType(value: unknown): value is EquipmentType {
  return typeof value === 'string' && (EQUIPMENT_TYPES as readonly string[]).includes(value);
}

/** A single line in the rate breakdown. Amounts are integer US cents. */
export interface RateLineItem {
  key: string;
  label: string;
  amountCents: number;
}

/** The normalized, validated inputs that drive a quote. */
export interface QuoteInput {
  origin: string;
  destination: string;
  equipment: EquipmentType;
  pickupDate: string; // ISO-8601 date (YYYY-MM-DD)
  freightDescription: string;
  weightLbs?: number;
}

/** An instant quote returned to the shipper. */
export interface Quote extends QuoteInput {
  id: string;
  /** Estimated lane distance the linehaul was priced on. */
  miles: number;
  currency: 'USD';
  totalCents: number;
  breakdown: RateLineItem[];
  createdAt: string; // ISO-8601
  /** After this instant the quote can no longer be accepted (must re-quote). */
  expiresAt: string; // ISO-8601
}

/**
 * A load created when a shipper accepts a quote — the seed of the tracking
 * view built out in Phase 2. Embeds the priced quote so the confirmation +
 * summary screen can show the lane and rate without a second lookup.
 */
export interface BookedLoad {
  id: string;
  quoteId: string;
  shipperId: string;
  status: LoadStatus;
  origin: string;
  destination: string;
  equipment: EquipmentType;
  pickupDate: string;
  freightDescription: string;
  weightLbs?: number;
  currency: 'USD';
  totalCents: number;
  breakdown: RateLineItem[];
  createdAt: string;
}
