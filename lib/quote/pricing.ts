/**
 * Instant-quote pricing engine.
 *
 * Pure + deterministic so it can be unit tested without a DB or network and so
 * two identical lanes always quote the same rate. `foundations` does not yet
 * geocode lanes, so distance is derived deterministically from the lane string
 * within a realistic band; the model (linehaul + fuel + surcharges + booking
 * fee) is the real shape the pricing service (Task 5) fills in later.
 */

import type { EquipmentType, QuoteInput, RateLineItem } from './types.ts';

/** Per-mile linehaul base by equipment, in integer US cents. */
const PER_MILE_CENTS: Record<EquipmentType, number> = {
  dry_van: 210,
  reefer: 265,
  flatbed: 245,
  power_only: 175,
};

const MIN_MILES = 150;
const MAX_MILES = 2600;
const FUEL_SURCHARGE_PCT = 0.18;
const HEAVY_FREIGHT_LBS = 30_000;
const HEAVY_FREIGHT_PCT = 0.08;
const BOOKING_FEE_CENTS = 5_000; // flat $50 marketplace fee

export interface PricedLoad {
  miles: number;
  currency: 'USD';
  totalCents: number;
  breakdown: RateLineItem[];
}

/** djb2 string hash — small, dependency-free, deterministic. */
function hashString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Deterministic stand-in for real lane mileage. Same lane → same miles, mapped
 * into a realistic [MIN_MILES, MAX_MILES] band.
 */
export function estimateMiles(origin: string, destination: string): number {
  const lane = `${origin.trim().toLowerCase()}->${destination.trim().toLowerCase()}`;
  const span = MAX_MILES - MIN_MILES;
  return MIN_MILES + (hashString(lane) % span);
}

/** Price a validated quote input into a rate + itemized breakdown. */
export function priceLoad(input: QuoteInput): PricedLoad {
  const miles = estimateMiles(input.origin, input.destination);
  const perMile = PER_MILE_CENTS[input.equipment];
  const linehaulCents = miles * perMile;
  const fuelCents = Math.round(linehaulCents * FUEL_SURCHARGE_PCT);

  const breakdown: RateLineItem[] = [
    {
      key: 'linehaul',
      label: `Linehaul · ${miles} mi @ $${(perMile / 100).toFixed(2)}/mi`,
      amountCents: linehaulCents,
    },
    { key: 'fuel', label: 'Fuel surcharge', amountCents: fuelCents },
  ];

  if (typeof input.weightLbs === 'number' && input.weightLbs > HEAVY_FREIGHT_LBS) {
    breakdown.push({
      key: 'heavy_freight',
      label: 'Heavy freight surcharge',
      amountCents: Math.round(linehaulCents * HEAVY_FREIGHT_PCT),
    });
  }

  breakdown.push({ key: 'booking_fee', label: 'Booking fee', amountCents: BOOKING_FEE_CENTS });

  const totalCents = breakdown.reduce((sum, item) => sum + item.amountCents, 0);
  return { miles, currency: 'USD', totalCents, breakdown };
}

/** Format integer US cents as a USD string, e.g. 123456 → "$1,234.56". */
export function formatUsd(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
