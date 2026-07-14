import { NextResponse } from 'next/server';
import {
  quoteStore,
  QuoteExpiredError,
  QuoteNotFoundError,
} from '@/lib/quote/store';

/** Demo shipper — real auth comes from the session cookie (Phase 3 `lib/session`). */
const DEMO_SHIPPER_ID = 'shp_demo';

/**
 * POST /api/quotes/:id/accept — accept a quote and create a confirmed load.
 *
 * 404 → { error: 'quote_not_found' }
 * 409 → { error: 'quote_expired' }   (client should prompt a re-quote)
 * 201 → { load: BookedLoad }
 */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const load = quoteStore.acceptQuote(params.id, DEMO_SHIPPER_ID);
    return NextResponse.json({ load }, { status: 201 });
  } catch (err) {
    if (err instanceof QuoteExpiredError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 409 });
    }
    if (err instanceof QuoteNotFoundError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 404 });
    }
    throw err;
  }
}
