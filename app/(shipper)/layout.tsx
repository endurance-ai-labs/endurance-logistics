import type { ReactNode } from 'react';
import Link from 'next/link';

/** Shared chrome for the shipper-facing marketplace surfaces. */
export default function ShipperLayout({ children }: { children: ReactNode }) {
  return (
    <div className="shipper-shell">
      <header className="shipper-shell__topbar">
        <Link href="/quote" className="shipper-shell__brand">
          Endurance
        </Link>
        <span className="shipper-shell__role">Shipper</span>
      </header>
      <main className="shipper-shell__main">{children}</main>
    </div>
  );
}
