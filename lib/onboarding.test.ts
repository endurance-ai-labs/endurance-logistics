import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onboardShipper, onboardCarrier } from './onboarding.ts';
import { InMemoryDataStore } from './ingest/store.ts';
import { StubFmcsaClient } from './vetting/fmcsa.ts';
import { canCarrierAcceptLoads } from './authz.ts';

const now = () => '2026-07-14T00:00:00.000Z';

test('onboardShipper persists and requires name/email', async () => {
  const store = new InMemoryDataStore();
  const s = await onboardShipper({ name: 'Acme', email: 'a@x.example' }, store, { now });
  assert.equal(s.source, 'signup');
  assert.ok((await store.getShipperByMcleodId(s.mcleodCustomerId)) !== undefined);
  await assert.rejects(() => onboardShipper({ name: '', email: 'a@x.example' }, store));
});

test('onboardCarrier vets via FMCSA and gates acceptance', async () => {
  const store = new InMemoryDataStore();
  const fmcsa = new StubFmcsaClient({
    '80321': { dotNumber: '80321', allowedToOperate: true, outOfService: false, insuranceOnFile: true },
  });
  const { carrier } = await onboardCarrier(
    { dotNumber: '80321', legalName: 'RJS Line Haul LLC', email: 'd@rjs.example' },
    store,
    fmcsa,
    { now },
  );
  assert.equal(carrier.vettingStatus, 'approved');
  assert.equal(canCarrierAcceptLoads(carrier), true);
});

test('onboardCarrier flags un-insured carriers into review (cannot accept)', async () => {
  const store = new InMemoryDataStore();
  const fmcsa = new StubFmcsaClient({
    '265986': { dotNumber: '265986', allowedToOperate: true, outOfService: false, insuranceOnFile: false },
  });
  const { carrier } = await onboardCarrier(
    { dotNumber: '265986', legalName: 'Lone Star Freight', email: 'o@ls.example' },
    store,
    fmcsa,
    { now },
  );
  assert.equal(carrier.vettingStatus, 'in_review');
  assert.equal(canCarrierAcceptLoads(carrier), false);
});

test('onboardCarrier rejects invalid DOT number', async () => {
  const store = new InMemoryDataStore();
  await assert.rejects(() =>
    onboardCarrier({ dotNumber: 'nope', legalName: 'X', email: 'x@x.example' }, store, new StubFmcsaClient()),
  );
});
