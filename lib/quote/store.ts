/**
 * In-memory quote + booking store backing the shipper flow.
 *
 * Mirrors `lib/ingest/store.ts`: an in-memory implementation good enough for
 * the demo/happy-path and the tests, with the same shape the Postgres-backed
 * store (Task 5) will implement. Exposed as a process-wide singleton so the
 * `/api/quotes` route handlers and the `loads/[id]` server component share
 * state within a running server instance.
 */

import { randomUUID } from 'node:crypto';
import type { BookedLoad, Quote, QuoteInput } from './types.ts';
import { priceLoad } from './pricing.ts';

/** How long an instant quote stays acceptable before it must be re-quoted. */
export const QUOTE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export interface QuoteStore {
  createQuote(input: QuoteInput, now?: number): Quote;
  getQuote(id: string): Quote | undefined;
  isExpired(quote: Quote, now?: number): boolean;
  /** Accept a quote → create a confirmed load. Throws if missing/expired. */
  acceptQuote(quoteId: string, shipperId: string, now?: number): BookedLoad;
  getLoad(id: string): BookedLoad | undefined;
}

export class QuoteExpiredError extends Error {
  readonly code = 'quote_expired';
  constructor() {
    super('Quote has expired; request a new quote.');
    this.name = 'QuoteExpiredError';
  }
}

export class QuoteNotFoundError extends Error {
  readonly code = 'quote_not_found';
  constructor() {
    super('Quote not found.');
    this.name = 'QuoteNotFoundError';
  }
}

export class InMemoryQuoteStore implements QuoteStore {
  private readonly quotes = new Map<string, Quote>();
  private readonly loads = new Map<string, BookedLoad>();

  createQuote(input: QuoteInput, now: number = Date.now()): Quote {
    const priced = priceLoad(input);
    const id = `q_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const quote: Quote = {
      ...input,
      id,
      miles: priced.miles,
      currency: priced.currency,
      totalCents: priced.totalCents,
      breakdown: priced.breakdown,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + QUOTE_TTL_MS).toISOString(),
    };
    this.quotes.set(id, quote);
    return quote;
  }

  getQuote(id: string): Quote | undefined {
    return this.quotes.get(id);
  }

  isExpired(quote: Quote, now: number = Date.now()): boolean {
    return now >= Date.parse(quote.expiresAt);
  }

  acceptQuote(quoteId: string, shipperId: string, now: number = Date.now()): BookedLoad {
    const quote = this.quotes.get(quoteId);
    if (!quote) throw new QuoteNotFoundError();
    if (this.isExpired(quote, now)) throw new QuoteExpiredError();

    const id = `ld_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const load: BookedLoad = {
      id,
      quoteId: quote.id,
      shipperId,
      status: 'confirmed',
      origin: quote.origin,
      destination: quote.destination,
      equipment: quote.equipment,
      pickupDate: quote.pickupDate,
      freightDescription: quote.freightDescription,
      ...(quote.weightLbs !== undefined ? { weightLbs: quote.weightLbs } : {}),
      currency: quote.currency,
      totalCents: quote.totalCents,
      breakdown: quote.breakdown,
      createdAt: new Date(now).toISOString(),
    };
    this.loads.set(id, load);
    return load;
  }

  getLoad(id: string): BookedLoad | undefined {
    return this.loads.get(id);
  }
}

/**
 * Process-wide singleton. Stashed on `globalThis` so Next's dev-mode module
 * reloading doesn't drop in-flight quotes between the POST and the accept.
 */
const globalForStore = globalThis as unknown as { __endrQuoteStore?: InMemoryQuoteStore };
export const quoteStore: InMemoryQuoteStore =
  globalForStore.__endrQuoteStore ?? (globalForStore.__endrQuoteStore = new InMemoryQuoteStore());
