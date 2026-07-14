import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Notifier, buildMessage, type TransitionContext } from './index.ts';
import { InMemoryNotificationProvider } from './provider.ts';

function ctx(overrides: Partial<TransitionContext> = {}): Omit<TransitionContext, 'transition'> {
  return {
    loadId: 'L1',
    origin: 'DAL',
    destination: 'HOU',
    shipper: { name: 'Acme', email: 'ship@acme.example', phone: '+15125550101' },
    carrier: { name: 'RJS', email: 'disp@rjs.example', phone: '+12105550117' },
    carrierName: 'RJS Line Haul LLC',
    ...overrides,
  };
}

test('confirmation notifies BOTH sides on every channel', async () => {
  const provider = new InMemoryNotificationProvider();
  const notifier = new Notifier(provider);
  const results = await notifier.onConfirmation(ctx());
  // shipper email+sms + carrier email+sms = 4
  assert.equal(results.length, 4);
  assert.equal(provider.byChannel('email').length, 2);
  assert.equal(provider.byChannel('sms').length, 2);
  assert.ok(provider.sent.some((m) => m.to === 'ship@acme.example'));
  assert.ok(provider.sent.some((m) => m.to === 'disp@rjs.example'));
});

test('all three transitions fire', async () => {
  const provider = new InMemoryNotificationProvider();
  const notifier = new Notifier(provider);
  await notifier.onConfirmation(ctx());
  await notifier.onCarrierAccepted(ctx());
  await notifier.onDelivered(ctx());
  assert.equal(provider.sent.length, 12); // 4 per transition x 3
});

test('idempotency key prevents double-send on retry', async () => {
  const provider = new InMemoryNotificationProvider();
  const notifier = new Notifier(provider);
  await notifier.onConfirmation(ctx());
  const retried = await notifier.onConfirmation(ctx()); // same transition + load
  assert.equal(retried.length, 0);
  assert.equal(provider.sent.length, 4);
});

test('only sends channels the party has', async () => {
  const provider = new InMemoryNotificationProvider();
  const notifier = new Notifier(provider);
  await notifier.onDelivered(
    ctx({
      shipper: { name: 'EmailOnly', email: 'e@x.example' },
      carrier: { name: 'SmsOnly', phone: '+1999' },
    }),
  );
  assert.equal(provider.byChannel('email').length, 1);
  assert.equal(provider.byChannel('sms').length, 1);
});

test('message templates reference the load + carrier name', () => {
  const full: TransitionContext = { ...ctx(), transition: 'carrier_accepted' };
  const shipperMsg = buildMessage(full, 'shipper');
  assert.match(shipperMsg.body, /RJS Line Haul LLC/);
  assert.match(shipperMsg.subject, /L1/);
  const carrierMsg = buildMessage(full, 'carrier');
  assert.match(carrierMsg.body, /assigned/i);
});
