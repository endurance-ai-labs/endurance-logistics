/**
 * Server-side validation for quote requests.
 *
 * Returns a field-keyed error map so the API can answer a 400 the client can
 * surface inline against each input. Kept pure + framework-agnostic so it is
 * unit tested directly and reused verbatim by the route handler.
 */

import { isEquipmentType, type QuoteInput } from './types.ts';

export type FieldErrors = Partial<Record<keyof QuoteInput, string>>;

export type ValidationResult =
  | { ok: true; value: QuoteInput }
  | { ok: false; fields: FieldErrors };

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** ISO date-only shape, e.g. 2026-07-14. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function validateQuoteInput(body: unknown): ValidationResult {
  const fields: FieldErrors = {};
  const input = (body ?? {}) as Record<string, unknown>;

  const origin = str(input.origin);
  const destination = str(input.destination);
  const equipment = input.equipment;
  const pickupDate = str(input.pickupDate);
  const freightDescription = str(input.freightDescription);

  if (!origin) fields.origin = 'Origin is required.';
  if (!destination) fields.destination = 'Destination is required.';
  else if (destination.toLowerCase() === origin.toLowerCase())
    fields.destination = 'Destination must differ from origin.';

  if (!isEquipmentType(equipment)) fields.equipment = 'Select an equipment type.';

  if (!pickupDate) fields.pickupDate = 'Pickup date is required.';
  else if (!ISO_DATE.test(pickupDate) || Number.isNaN(Date.parse(pickupDate)))
    fields.pickupDate = 'Enter a valid pickup date.';

  if (!freightDescription) fields.freightDescription = 'Describe the freight.';

  let weightLbs: number | undefined;
  if (input.weightLbs !== undefined && input.weightLbs !== null && input.weightLbs !== '') {
    const parsed = Number(input.weightLbs);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      fields.weightLbs = 'Weight must be a positive number.';
    } else if (parsed > 80_000) {
      fields.weightLbs = 'Weight exceeds the 80,000 lb legal limit.';
    } else {
      weightLbs = Math.round(parsed);
    }
  }

  if (Object.keys(fields).length > 0) return { ok: false, fields };

  const value: QuoteInput = {
    origin,
    destination,
    equipment: equipment as QuoteInput['equipment'],
    pickupDate,
    freightDescription,
    ...(weightLbs !== undefined ? { weightLbs } : {}),
  };
  return { ok: true, value };
}
