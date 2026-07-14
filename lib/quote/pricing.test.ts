import assert from 'node:assert/strict';
import { test } from 'node:test';
import { estimateMiles, formatUsd, priceLoad } from './pricing.ts';
import type { QuoteInput } from './types.ts';

const base: QuoteInput = {
  origin: 'Chicago, IL',
  destination: 'Dallas, TX',
  equipment: 'dry_van',
  pickupDate: '2026-07-20',
  freightDescription: 'Palletized dry goods',
};

test('estimateMiles is deterministic and inside the realistic band', () => {
  const a = estimateMiles('Chicago, IL', 'Dallas, TX');
  const b = estimateMiles('Chicago, IL', 'Dallas, TX');
  assert.equal(a, b);
  assert.ok(a >= 150 && a < 2600, `miles ${a} out of band`);
});

test('estimateMiles ignores case and surrounding whitespace', () => {
  assert.equal(estimateMiles('Chicago, IL', 'Dallas, TX'), estimateMiles('  chicago, il ', 'DALLAS, TX'));
});

test('priceLoad total equals the sum of its breakdown', () => {
  const priced = priceLoad(base);
  const sum = priced.breakdown.reduce((s, i) => s + i.amountCents, 0);
  assert.equal(priced.totalCents, sum);
  assert.ok(priced.totalCents > 0);
});

test('priceLoad always includes linehaul, fuel and a booking fee', () => {
  const keys = priceLoad(base).breakdown.map((i) => i.key);
  assert.deepEqual(keys, ['linehaul', 'fuel', 'booking_fee']);
});

test('reefer prices higher than dry van on the same lane', () => {
  const dry = priceLoad(base).totalCents;
  const reefer = priceLoad({ ...base, equipment: 'reefer' }).totalCents;
  assert.ok(reefer > dry);
});

test('heavy freight adds a surcharge line only above the threshold', () => {
  assert.ok(!priceLoad({ ...base, weightLbs: 12_000 }).breakdown.some((i) => i.key === 'heavy_freight'));
  const heavy = priceLoad({ ...base, weightLbs: 42_000 });
  assert.ok(heavy.breakdown.some((i) => i.key === 'heavy_freight'));
});

test('formatUsd renders integer cents as grouped USD', () => {
  assert.equal(formatUsd(123456), '$1,234.56');
  assert.equal(formatUsd(5000), '$50.00');
});
