'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import type { BookedLoad, Quote } from '@/lib/quote/types';

export interface AcceptQuoteProps {
  quote: Quote;
  /** Called when the server reports the quote can no longer be accepted. */
  onExpired: () => void;
}

/**
 * Accept → booking. Posts to the accept endpoint and, on success, routes the
 * shipper to the confirmation view for the freshly created load.
 */
export function AcceptQuote({ quote, onExpired }: AcceptQuoteProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = useCallback(async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/accept`, { method: 'POST' });
      if (res.status === 409) {
        onExpired();
        return;
      }
      if (!res.ok) {
        setError('We could not book this load. Please try again.');
        return;
      }
      const data = (await res.json()) as { load: BookedLoad };
      // Keep the button busy through navigation so it can't be double-submitted.
      router.push(`/loads/${data.load.id}`);
    } catch {
      setError('Network error — please try again.');
      setSubmitting(false);
    }
  }, [quote.id, onExpired, router]);

  return (
    <div className="accept-quote">
      {error ? (
        <p className="form-banner form-banner--error" role="alert">
          {error}
        </p>
      ) : null}
      <Button block loading={submitting} onClick={() => void accept()}>
        {submitting ? 'Booking…' : 'Accept & book this load'}
      </Button>
    </div>
  );
}
