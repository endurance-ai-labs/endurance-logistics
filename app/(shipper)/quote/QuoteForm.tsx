'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, CardBody, CardHeader, Field, SelectField } from '@/components/ui';
import { formatUsd } from '@/lib/quote/pricing';
import {
  EQUIPMENT_LABELS,
  EQUIPMENT_TYPES,
  type Quote,
} from '@/lib/quote/types';
import { AcceptQuote } from './AcceptQuote';

type FieldName =
  | 'origin'
  | 'destination'
  | 'equipment'
  | 'pickupDate'
  | 'freightDescription'
  | 'weightLbs';

type FormState = Record<FieldName, string>;
type FieldErrors = Partial<Record<FieldName, string>>;

const EMPTY_FORM: FormState = {
  origin: '',
  destination: '',
  equipment: '',
  pickupDate: '',
  freightDescription: '',
  weightLbs: '',
};

/** Client-side mirror of the server validation, for instant feedback. */
function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.origin.trim()) errors.origin = 'Origin is required.';
  if (!form.destination.trim()) errors.destination = 'Destination is required.';
  else if (form.destination.trim().toLowerCase() === form.origin.trim().toLowerCase())
    errors.destination = 'Destination must differ from origin.';
  if (!form.equipment) errors.equipment = 'Select an equipment type.';
  if (!form.pickupDate) errors.pickupDate = 'Pickup date is required.';
  if (!form.freightDescription.trim()) errors.freightDescription = 'Describe the freight.';
  if (form.weightLbs.trim()) {
    const n = Number(form.weightLbs);
    if (!Number.isFinite(n) || n <= 0) errors.weightLbs = 'Weight must be a positive number.';
    else if (n > 80_000) errors.weightLbs = 'Weight exceeds the 80,000 lb legal limit.';
  }
  return errors;
}

function useCountdown(expiresAt: string | undefined): { label: string; expired: boolean } {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  if (!expiresAt) return { label: '', expired: false };
  const remainingMs = Date.parse(expiresAt) - now;
  if (remainingMs <= 0) return { label: '0:00', expired: true };
  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return { label: `${minutes}:${seconds.toString().padStart(2, '0')}`, expired: false };
}

export function QuoteForm() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const { label: countdown, expired } = useCountdown(quote?.expiresAt);

  const setField = useCallback((name: FieldName, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const requestQuote = useCallback(async () => {
    setFormError(null);
    const clientErrors = validate(form);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          origin: form.origin,
          destination: form.destination,
          equipment: form.equipment,
          pickupDate: form.pickupDate,
          freightDescription: form.freightDescription,
          weightLbs: form.weightLbs || undefined,
        }),
      });
      if (res.status === 400) {
        const data = (await res.json()) as { fields?: FieldErrors };
        setErrors(data.fields ?? {});
        setFormError('Please fix the highlighted fields.');
        return;
      }
      if (!res.ok) {
        setFormError('We could not price this lane right now. Please try again.');
        return;
      }
      const data = (await res.json()) as Quote;
      setQuote(data);
    } catch {
      setFormError('Network error — check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }, [form]);

  const reQuote = useCallback(() => {
    setQuote(null);
    setFormError(null);
  }, []);

  if (quote) {
    return (
      <div className="quote-result" data-testid="quote-result">
        <Card>
          <CardHeader>
            <div className="quote-result__lane">
              <span className="quote-result__eyebrow">Instant quote</span>
              <h2>
                {quote.origin} <span aria-hidden="true">→</span> {quote.destination}
              </h2>
              <p className="quote-result__meta">
                {EQUIPMENT_LABELS[quote.equipment]} · {quote.miles} mi · pickup {quote.pickupDate}
              </p>
            </div>
            <div className="quote-result__price">
              <span className="quote-result__total">{formatUsd(quote.totalCents)}</span>
              <span className="quote-result__currency">{quote.currency} all-in</span>
            </div>
          </CardHeader>
          <CardBody>
            <ul className="rate-breakdown">
              {quote.breakdown.map((item) => (
                <li key={item.key}>
                  <span>{item.label}</span>
                  <span>{formatUsd(item.amountCents)}</span>
                </li>
              ))}
              <li className="rate-breakdown__total">
                <span>Total</span>
                <span>{formatUsd(quote.totalCents)}</span>
              </li>
            </ul>

            {expired ? (
              <div className="quote-expiry quote-expiry--expired" role="alert">
                <p>This quote has expired. Rates move fast — grab a fresh one.</p>
                <Button variant="secondary" onClick={reQuote}>
                  Re-quote this lane
                </Button>
              </div>
            ) : (
              <>
                <p className="quote-expiry" aria-live="polite">
                  Locked for <strong>{countdown}</strong>
                </p>
                <AcceptQuote quote={quote} onExpired={reQuote} />
                <button type="button" className="link-btn" onClick={reQuote}>
                  Edit lane
                </button>
              </>
            )}
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <form
      className="quote-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void requestQuote();
      }}
    >
      {formError ? (
        <p className="form-banner form-banner--error" role="alert">
          {formError}
        </p>
      ) : null}

      <Field
        id="origin"
        name="origin"
        label="Origin"
        placeholder="City, ST"
        autoComplete="off"
        required
        value={form.origin}
        error={errors.origin}
        onChange={(e) => setField('origin', e.target.value)}
      />
      <Field
        id="destination"
        name="destination"
        label="Destination"
        placeholder="City, ST"
        autoComplete="off"
        required
        value={form.destination}
        error={errors.destination}
        onChange={(e) => setField('destination', e.target.value)}
      />
      <SelectField
        id="equipment"
        name="equipment"
        label="Equipment"
        required
        value={form.equipment}
        error={errors.equipment}
        onChange={(e) => setField('equipment', e.target.value)}
      >
        <option value="" disabled>
          Select equipment…
        </option>
        {EQUIPMENT_TYPES.map((type) => (
          <option key={type} value={type}>
            {EQUIPMENT_LABELS[type]}
          </option>
        ))}
      </SelectField>
      <Field
        id="pickupDate"
        name="pickupDate"
        type="date"
        label="Pickup date"
        min={today}
        required
        value={form.pickupDate}
        error={errors.pickupDate}
        onChange={(e) => setField('pickupDate', e.target.value)}
      />
      <Field
        id="freightDescription"
        name="freightDescription"
        label="Freight description"
        placeholder="e.g. 12 pallets of packaged goods"
        required
        value={form.freightDescription}
        error={errors.freightDescription}
        onChange={(e) => setField('freightDescription', e.target.value)}
      />
      <Field
        id="weightLbs"
        name="weightLbs"
        type="number"
        inputMode="numeric"
        label="Weight (lbs)"
        hint="Optional — helps us price heavy freight accurately."
        min={1}
        max={80_000}
        value={form.weightLbs}
        error={errors.weightLbs}
        onChange={(e) => setField('weightLbs', e.target.value)}
      />

      <Button type="submit" block loading={submitting}>
        {submitting ? 'Pricing your lane…' : 'Get instant quote'}
      </Button>
    </form>
  );
}
