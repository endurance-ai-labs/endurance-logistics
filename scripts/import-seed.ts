#!/usr/bin/env node
/**
 * Idempotent RJS/McLeod seed importer.
 *
 * Usage:
 *   npm run import:seed -- [path/to/export.json]
 *
 * Reads a McLeod export (defaults to the sample fixture), runs carriers through
 * the FMCSA vetting hook, and upserts by natural key. Re-running the same export
 * converges (all-updates, zero creates) — see docs/ingestion.md.
 *
 * This entrypoint uses the InMemoryDataStore + StubFmcsaClient so it runs
 * offline in CI/dev. Wiring the Postgres store + live FMCSA client is a one-line
 * swap once the app data layer (Tasks 1–2) lands.
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { importExport, type McLeodExport } from '../lib/ingest/mcleod.ts';
import { InMemoryDataStore } from '../lib/ingest/store.ts';
import { StubFmcsaClient, type FmcsaSnapshot } from '../lib/vetting/fmcsa.ts';

async function main(): Promise<void> {
  const path = resolve(process.argv[2] ?? 'seed/rjs-mcleod-export.sample.json');
  const raw = await readFile(path, 'utf8');
  const data = JSON.parse(raw) as McLeodExport;

  const store = new InMemoryDataStore();

  // Local/dev vetting fixtures. In prod, swap for a live FMCSA client.
  const fmcsa = new StubFmcsaClient();
  const approve = (dot: string, name: string): FmcsaSnapshot => ({
    dotNumber: dot,
    legalName: name,
    allowedToOperate: true,
    outOfService: false,
    insuranceOnFile: true,
    operatingStatus: 'AUTHORIZED',
  });
  for (const c of data.carriers ?? []) {
    const dot = c.dot_number != null ? String(c.dot_number) : '';
    if (!dot) continue;
    // Demo policy: everything approves except the explicit OOS fixture.
    if (/oos|out.?of.?service/i.test(c.name ?? '')) {
      fmcsa.set({ ...approve(dot, c.name ?? ''), allowedToOperate: false, outOfService: true });
    } else {
      fmcsa.set(approve(dot, c.name ?? ''));
    }
  }

  const report = await importExport(data, store, { fmcsa });

  const carriers = await store.listCarriers();
  const shippers = await store.listShippers();

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        source: path,
        carriers: report.carriers,
        shippers: report.shippers,
        totals: { carriers: carriers.length, shippers: shippers.length },
        vetting: carriers.map((c) => ({ dot: c.dotNumber, name: c.legalName, status: c.vettingStatus })),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('import-seed failed:', err);
  process.exitCode = 1;
});
