import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardBody, CardHeader } from '@/components/ui';
import { formatUsd } from '@/lib/quote/pricing';
import { EQUIPMENT_LABELS } from '@/lib/quote/types';
import { quoteStore } from '@/lib/quote/store';

const STATUS_LABELS: Record<string, string> = {
  quoted: 'Quoted',
  confirmed: 'Confirmed',
  carrier_accepted: 'Carrier assigned',
  in_transit: 'In transit',
  delivered: 'Delivered',
};

export default function LoadPage({ params }: { params: { id: string } }) {
  const load = quoteStore.getLoad(params.id);
  if (!load) notFound();

  return (
    <section className="page page--load">
      <div className="confirm-hero">
        <div className="confirm-hero__badge" aria-hidden="true">
          ✓
        </div>
        <h1>Load booked</h1>
        <p>
          Your load is confirmed and being surfaced to vetted carriers. We&apos;ll notify you the
          moment one accepts.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div>
            <span className="quote-result__eyebrow">Load {load.id}</span>
            <h2>
              {load.origin} <span aria-hidden="true">→</span> {load.destination}
            </h2>
            <p className="quote-result__meta">
              {EQUIPMENT_LABELS[load.equipment]} · pickup {load.pickupDate}
            </p>
          </div>
          <span className={`status-pill status-pill--${load.status}`}>
            {STATUS_LABELS[load.status] ?? load.status}
          </span>
        </CardHeader>
        <CardBody>
          <dl className="load-summary">
            <div>
              <dt>Lane</dt>
              <dd>
                {load.origin} → {load.destination}
              </dd>
            </div>
            <div>
              <dt>Equipment</dt>
              <dd>{EQUIPMENT_LABELS[load.equipment]}</dd>
            </div>
            <div>
              <dt>Pickup</dt>
              <dd>{load.pickupDate}</dd>
            </div>
            <div>
              <dt>Freight</dt>
              <dd>{load.freightDescription}</dd>
            </div>
            {typeof load.weightLbs === 'number' ? (
              <div>
                <dt>Weight</dt>
                <dd>{load.weightLbs.toLocaleString('en-US')} lbs</dd>
              </div>
            ) : null}
            <div>
              <dt>All-in rate</dt>
              <dd className="load-summary__rate">{formatUsd(load.totalCents)}</dd>
            </div>
          </dl>

          <Link className="link-btn" href="/quote">
            Quote another lane
          </Link>
        </CardBody>
      </Card>
    </section>
  );
}
