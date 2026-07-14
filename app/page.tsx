import { redirect } from 'next/navigation';

/** The marketplace entry point routes shippers straight into the quote flow. */
export default function HomePage() {
  redirect('/quote');
}
