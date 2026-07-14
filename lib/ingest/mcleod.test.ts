import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  importCarriers,
  importShippers,
  importExport,
  normalizeCarrier,
  normalizeShipper,
  type McLeodCarrierRow,
} from './mcleod.ts';
import { InMemoryDataStore } from './store.ts';
import { StubFmcsaClient, type FmcsaSnapshot } from '../vetting/fmcsa.ts';

const NOW = '2026-07-14T00:00:00.000Z';
const now = () => NOW;

function fmcsaFor(rows: McLeodCarrierRow[], approve = true): StubFmcsaClient {
  const client = new StubFmcsaClient();
  for (const r of rows) {
    if (r.dot_number == null) continue;
    const snap: FmcsaSnapshot = {
      dotNumber: String(r.dot_number),
      allowedToOperate: approve,
      outOfService: !approve,
      insuranceOnFile: approve,
    };
    client.set(snap);
  }
  return client;
}

const carrierRows: McLeodCarrierRow[] = [
  { id: 'C1', dot_number: '80321', mc_number: 'MC-1', name: 'RJS Line Haul LLC', email: 'a@x.example' },
  { id: 'C2', dot_number: 265986, name: 'Lone Star Freight', email: 'b@x.example' },
];

test('normalizeCarrier requires a valid DOT and name', () => {
  assert.equal(normalizeCarrier({ name: 'X' }, 'pending', NOW, 'mcleod').ok, false);
  assert.equal(normalizeCarrier({ dot_number: 'abc', name: 'X' }, 'pending', NOW, 'mcleod').ok, false);
  assert.equal(normalizeCarrier({ dot_number: '5', name: '' }, 'pending', NOW, 'mcleod').ok, false);
  const ok = normalizeCarrier({ dot_number: 5, name: 'X' }, 'approved', NOW, 'mcleod');
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.carrier.dotNumber, '5');
});

test('normalizeShipper falls back to id when customer_id absent', () => {
  const r = normalizeShipper({ id: 'MCL-S-9', name: 'Acme' }, NOW, 'mcleod');
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.shipper.mcleodCustomerId, 'MCL-S-9');
});

test('importCarriers vets and populates vetting_status', async () => {
  const store = new InMemoryDataStore();
  const report = await importCarriers(carrierRows, store, { fmcsa: fmcsaFor(carrierRows), now });
  assert.equal(report.created, 2);
  assert.equal(report.updated, 0);
  const c = await store.getCarrierByDot('80321');
  assert.equal(c?.vettingStatus, 'approved');
  assert.equal(c?.source, 'mcleod');
});

test('import is idempotent — re-running yields updates, not duplicates', async () => {
  const store = new InMemoryDataStore();
  const opts = { fmcsa: fmcsaFor(carrierRows), now };
  const first = await importCarriers(carrierRows, store, opts);
  assert.equal(first.created, 2);
  const second = await importCarriers(carrierRows, store, opts);
  assert.equal(second.created, 0);
  assert.equal(second.updated, 2);
  assert.equal((await store.listCarriers()).length, 2);
});

test('upsert preserves stable id + onboardedAt across re-import', async () => {
  const store = new InMemoryDataStore();
  await importCarriers(carrierRows, store, { fmcsa: fmcsaFor(carrierRows), now: () => NOW });
  const before = await store.getCarrierByDot('80321');
  await importCarriers(carrierRows, store, { fmcsa: fmcsaFor(carrierRows), now: () => '2027-01-01T00:00:00.000Z' });
  const after = await store.getCarrierByDot('80321');
  assert.equal(after?.id, before?.id);
  assert.equal(after?.onboardedAt, before?.onboardedAt); // unchanged
});

test('bad rows are skipped and reported, good rows still import', async () => {
  const rows: McLeodCarrierRow[] = [...carrierRows, { id: 'C3', name: 'No DOT Co' }];
  const store = new InMemoryDataStore();
  const report = await importCarriers(rows, store, { fmcsa: fmcsaFor(rows), now });
  assert.equal(report.created, 2);
  assert.equal(report.skipped, 1);
  assert.equal(report.errors.length, 1);
});

test('importShippers imports customers', async () => {
  const store = new InMemoryDataStore();
  const report = await importShippers(
    [
      { customer_id: 'CUST-A', name: 'Acme', email: 'a@x.example' },
      { customer_id: 'CUST-B', name: 'Delta' },
    ],
    store,
    { now },
  );
  assert.equal(report.created, 2);
  assert.equal((await store.listShippers()).length, 2);
});

test('importExport imports both sides together', async () => {
  const store = new InMemoryDataStore();
  const res = await importExport(
    { carriers: carrierRows, customers: [{ customer_id: 'CUST-A', name: 'Acme' }] },
    store,
    { fmcsa: fmcsaFor(carrierRows), now },
  );
  assert.equal(res.carriers.created, 2);
  assert.equal(res.shippers.created, 1);
});
