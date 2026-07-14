import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  decideVetting,
  vetCarrier,
  StubFmcsaClient,
  type FmcsaSnapshot,
  type FmcsaClient,
} from './fmcsa.ts';

const base: FmcsaSnapshot = {
  dotNumber: '80321',
  allowedToOperate: true,
  outOfService: false,
  insuranceOnFile: true,
};

test('approves an active, insured, in-service carrier', () => {
  assert.equal(decideVetting(base).status, 'approved');
});

test('rejects out-of-service carriers', () => {
  assert.equal(decideVetting({ ...base, outOfService: true }).status, 'rejected');
});

test('rejects carriers not allowed to operate', () => {
  assert.equal(decideVetting({ ...base, allowedToOperate: false }).status, 'rejected');
});

test('flags missing insurance for manual review', () => {
  const d = decideVetting({ ...base, insuranceOnFile: false });
  assert.equal(d.status, 'in_review');
  assert.match(d.reasons.join(' '), /insurance/i);
});

test('rejects when FMCSA has no record', () => {
  assert.equal(decideVetting(null).status, 'rejected');
});

test('vetCarrier validates DOT number format', async () => {
  const client = new StubFmcsaClient();
  assert.equal((await vetCarrier('not-a-number', client)).status, 'rejected');
  assert.equal((await vetCarrier('', client)).status, 'rejected');
});

test('vetCarrier resolves via the client', async () => {
  const client = new StubFmcsaClient({ '80321': base });
  const d = await vetCarrier('80321', client);
  assert.equal(d.status, 'approved');
  // Unknown DOT -> no record -> rejected.
  assert.equal((await vetCarrier('111', client)).status, 'rejected');
});

test('vetCarrier fails closed to in_review on client error', async () => {
  const flaky: FmcsaClient = {
    async lookup() {
      throw new Error('FMCSA 503');
    },
  };
  const d = await vetCarrier('80321', flaky);
  assert.equal(d.status, 'in_review');
  assert.match(d.reasons.join(' '), /FMCSA lookup failed/);
});
