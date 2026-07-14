import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateQuoteInput } from './validate.ts';

const valid = {
  origin: 'Chicago, IL',
  destination: 'Dallas, TX',
  equipment: 'dry_van',
  pickupDate: '2026-07-20',
  freightDescription: 'Palletized dry goods',
};

test('accepts a well-formed request and normalizes whitespace', () => {
  const result = validateQuoteInput({ ...valid, origin: '  Chicago, IL  ' });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.origin, 'Chicago, IL');
});

test('flags every missing required field', () => {
  const result = validateQuoteInput({});
  assert.equal(result.ok, false);
  if (!result.ok) {
    for (const key of ['origin', 'destination', 'equipment', 'pickupDate', 'freightDescription'] as const) {
      assert.ok(result.fields[key], `expected error on ${key}`);
    }
  }
});

test('rejects an unknown equipment type', () => {
  const result = validateQuoteInput({ ...valid, equipment: 'spaceship' });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.fields.equipment);
});

test('rejects a destination identical to the origin', () => {
  const result = validateQuoteInput({ ...valid, destination: 'chicago, il' });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.fields.destination);
});

test('rejects a malformed pickup date', () => {
  const result = validateQuoteInput({ ...valid, pickupDate: '07/20/2026' });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.fields.pickupDate);
});

test('weight is optional but must be positive and legal when present', () => {
  assert.equal(validateQuoteInput({ ...valid }).ok, true);
  assert.equal(validateQuoteInput({ ...valid, weightLbs: '' }).ok, true);
  assert.equal(validateQuoteInput({ ...valid, weightLbs: -5 }).ok, false);
  assert.equal(validateQuoteInput({ ...valid, weightLbs: 90_000 }).ok, false);
  const ok = validateQuoteInput({ ...valid, weightLbs: '18000' });
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.value.weightLbs, 18_000);
});
