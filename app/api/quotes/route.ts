import { NextResponse } from 'next/server';
import { validateQuoteInput } from '@/lib/quote/validate';
import { quoteStore } from '@/lib/quote/store';

/**
 * POST /api/quotes — price a lane and return an instant, expiring quote.
 *
 * This is the shipper-UI-facing contract Task 5 (pricing service) fills in;
 * `foundations` ships the UI against it with an in-memory reference impl so the
 * happy path is demonstrable today.
 *
 * 400 → { error: 'validation_error', fields: { <field>: <message> } }
 * 201 → Quote
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid_json', message: 'Request body must be valid JSON.' },
      { status: 400 },
    );
  }

  const result = validateQuoteInput(body);
  if (!result.ok) {
    return NextResponse.json({ error: 'validation_error', fields: result.fields }, { status: 400 });
  }

  const quote = quoteStore.createQuote(result.value);
  return NextResponse.json(quote, { status: 201 });
}
