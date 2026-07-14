/**
 * RJS / McLeod carrier + shipper ingestion.
 *
 * Replaces the stubbed seed with a real, idempotent import from a McLeod
 * export. The raw shapes mirror McLeod's `carrier` and `customer` tables (as
 * referenced in rjs-platform's McLeod ingest); we normalize them into our own
 * domain records, run carriers through the FMCSA vetting hook, and upsert by
 * natural key so re-running the import converges instead of duplicating.
 */

import { createHash } from 'node:crypto';
import type { Carrier, Shipper, VettingStatus } from '../types.ts';
import type { DataStore } from './store.ts';
import { vetCarrier, type FmcsaClient } from '../vetting/fmcsa.ts';

/** Raw carrier row as exported from McLeod (subset). */
export interface McLeodCarrierRow {
  /** McLeod carrier id. */
  id?: string;
  dot_number?: string | number | null;
  mc_number?: string | number | null;
  name?: string | null;
  dba_name?: string | null;
  email?: string | null;
  phone?: string | null;
}

/** Raw customer/shipper row as exported from McLeod (subset). */
export interface McLeodCustomerRow {
  id?: string;
  customer_id?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  bill_to_address?: string | null;
}

export interface ImportReport {
  created: number;
  updated: number;
  skipped: number;
  errors: { key: string; reason: string }[];
}

function emptyReport(): ImportReport {
  return { created: 0, updated: 0, skipped: 0, errors: [] };
}

function str(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s.length ? s : undefined;
}

/** Deterministic id derived from a stable natural key (no random/no clock). */
function deterministicId(prefix: string, naturalKey: string): string {
  const h = createHash('sha1').update(naturalKey).digest('hex').slice(0, 16);
  return `${prefix}_${h}`;
}

export interface ImportOptions {
  fmcsa: FmcsaClient;
  /** Injectable clock so imports are reproducible in tests. */
  now?: () => string;
  source?: Carrier['source'];
}

/**
 * Normalize a raw McLeod carrier row into our domain shape, or return an error.
 * DOT number is required — it is both the natural key and the vetting input.
 */
export function normalizeCarrier(
  row: McLeodCarrierRow,
  vettingStatus: VettingStatus,
  now: string,
  source: Carrier['source'],
): { ok: true; carrier: Carrier } | { ok: false; reason: string } {
  const dotNumber = str(row.dot_number);
  const legalName = str(row.name);
  if (!dotNumber) return { ok: false, reason: 'missing dot_number' };
  if (!/^\d+$/.test(dotNumber)) return { ok: false, reason: `invalid dot_number: ${dotNumber}` };
  if (!legalName) return { ok: false, reason: 'missing name' };

  const carrier: Carrier = {
    id: deterministicId('car', `dot:${dotNumber}`),
    dotNumber,
    ...(str(row.mc_number) ? { mcNumber: str(row.mc_number) } : {}),
    legalName,
    ...(str(row.dba_name) ? { dbaName: str(row.dba_name) } : {}),
    email: str(row.email) ?? '',
    ...(str(row.phone) ? { phone: str(row.phone) } : {}),
    vettingStatus,
    vettedAt: now,
    onboardedAt: now,
    source,
  };
  return { ok: true, carrier };
}

export function normalizeShipper(
  row: McLeodCustomerRow,
  now: string,
  source: Shipper['source'],
): { ok: true; shipper: Shipper } | { ok: false; reason: string } {
  const mcleodCustomerId = str(row.customer_id) ?? str(row.id);
  const name = str(row.name);
  if (!mcleodCustomerId) return { ok: false, reason: 'missing customer_id' };
  if (!name) return { ok: false, reason: 'missing name' };

  const shipper: Shipper = {
    id: deterministicId('shp', `mcleod:${mcleodCustomerId}`),
    mcleodCustomerId,
    name,
    email: str(row.email) ?? '',
    ...(str(row.phone) ? { phone: str(row.phone) } : {}),
    ...(str(row.bill_to_address) ? { billingAddress: str(row.bill_to_address) } : {}),
    onboardedAt: now,
    source,
  };
  return { ok: true, shipper };
}

/**
 * Import carriers idempotently. Each carrier is vetted via FMCSA before upsert
 * so `vetting_status` is populated on ingest. Re-running with the same export
 * yields all-updates and zero creates (idempotent).
 */
export async function importCarriers(
  rows: readonly McLeodCarrierRow[],
  store: DataStore,
  opts: ImportOptions,
): Promise<ImportReport> {
  const now = opts.now?.() ?? new Date().toISOString();
  const source = opts.source ?? 'mcleod';
  const report = emptyReport();

  for (const row of rows) {
    const dotForKey = str(row.dot_number) ?? '<no-dot>';
    // Vet first so the persisted record always carries a vetting_status.
    let vettingStatus: VettingStatus = 'pending';
    if (str(row.dot_number)) {
      vettingStatus = (await vetCarrier(str(row.dot_number)!, opts.fmcsa)).status;
    }
    const normalized = normalizeCarrier(row, vettingStatus, now, source);
    if (!normalized.ok) {
      report.skipped++;
      report.errors.push({ key: `dot:${dotForKey}`, reason: normalized.reason });
      continue;
    }
    const { created } = await store.upsertCarrier(normalized.carrier);
    if (created) report.created++;
    else report.updated++;
  }
  return report;
}

export async function importShippers(
  rows: readonly McLeodCustomerRow[],
  store: DataStore,
  opts: Pick<ImportOptions, 'now' | 'source'> = {},
): Promise<ImportReport> {
  const now = opts.now?.() ?? new Date().toISOString();
  const source = opts.source ?? 'mcleod';
  const report = emptyReport();

  for (const row of rows) {
    const keyForErr = str(row.customer_id) ?? str(row.id) ?? '<no-id>';
    const normalized = normalizeShipper(row, now, source);
    if (!normalized.ok) {
      report.skipped++;
      report.errors.push({ key: `cust:${keyForErr}`, reason: normalized.reason });
      continue;
    }
    const { created } = await store.upsertShipper(normalized.shipper);
    if (created) report.created++;
    else report.updated++;
  }
  return report;
}

/** Shape of the on-disk McLeod export the CLI consumes. */
export interface McLeodExport {
  carriers?: McLeodCarrierRow[];
  customers?: McLeodCustomerRow[];
}

export async function importExport(
  data: McLeodExport,
  store: DataStore,
  opts: ImportOptions,
): Promise<{ carriers: ImportReport; shippers: ImportReport }> {
  const carriers = await importCarriers(data.carriers ?? [], store, opts);
  const shippers = await importShippers(data.customers ?? [], store, {
    ...(opts.now ? { now: opts.now } : {}),
    ...(opts.source ? { source: opts.source } : {}),
  });
  return { carriers, shippers };
}
