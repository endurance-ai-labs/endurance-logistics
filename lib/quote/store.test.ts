import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  InMemoryQuoteStore,
  QUOTE_TTL_MS,
  QuoteExpiredError,
  QuoteNotFoundError,
} from './store.ts';
import type { QuoteInput } from './types.ts';

const input: QuoteInput = {
  origin: 'Chicago, IL',
  destination: 'Dallas, TX',
  equipment: 'flatbed',
  pickupDate: '2026-07-20',
  freightDescription: 'Steel coils',
  weightLbs: 44_000,
};

const T0 = Date.parse('2026-07-14T12:00:00.000Z');

test('createQuote prices and stamps an expiry TTL ahead of creation', () => {
  const store = new InMemoryQuoteStore();
  const quote = store.createQuote(input, T0);
  assert.ok(quote.id.startsWith('q_'));
  assert.equal(quote.totalCents, quote.breakdown.reduce((s, i) => s + i.amountCents, 0));
  assert.equal(Date.parse(quote.expiresAt) - Date.parse(quote.createdAt), QUOTE_TTL_MS);
  assert.equal(store.getQuote(quote.id)?.id, quote.id);
});

test('acceptQuote turns a fresh quote into a confirmed load carrying the rate', () => {
  const store = new InMemoryQuoteStore();
  const quote = store.createQuote(input, T0);
  const load = store.acceptQuote(quote.id, 'shp_1', T0 + 1000);
  assert.ok(load.id.startsWith('ld_'));
  assert.equal(load.status, 'confirmed');
  assert.equal(load.quoteId, quote.id);
  assert.equal(load.shipperId, 'shp_1');
  assert.equal(load.totalCents, quote.totalCents);
  assert.equal(load.weightLbs, 44_000);
  assert.equal(store.getLoad(load.id)?.id, load.id);
});

test('acceptQuote rejects an expired quote', () => {
  const store = new InMemoryQuoteStore();
  const quote = store.createQuote(input, T0);
  assert.equal(store.isExpired(quote, T0 + QUOTE_TTL_MS), true);
  assert.throws(() => store.acceptQuote(quote.id, 'shp_1', T0 + QUOTE_TTL_MS + 1), QuoteExpiredError);
});

test('acceptQuote throws for an unknown quote id', () => {
  const store = new InMemoryQuoteStore();
  assert.throws(() => store.acceptQuote('q_missing', 'shp_1', T0), QuoteNotFoundError);
});
