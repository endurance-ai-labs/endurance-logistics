import type { Metadata } from 'next';
import { QuoteForm } from './QuoteForm';

export const metadata: Metadata = {
  title: 'Get a quote · Endurance',
  description: 'Instant freight quotes — enter your lane and book in minutes.',
};

export default function QuotePage() {
  return (
    <section className="page page--quote">
      <header className="page__intro">
        <span className="page__eyebrow">Ship freight</span>
        <h1>Quote a lane in seconds</h1>
        <p>Tell us where it&apos;s going. Get an instant, all-in rate and book on the spot.</p>
      </header>
      <QuoteForm />
    </section>
  );
}
