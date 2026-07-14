import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  requireRole,
  canViewLoad,
  scopeLoads,
  canCarrierAcceptLoads,
  assertCarrierMayAccept,
  AuthzError,
} from './authz.ts';
import type { SessionClaims } from './session.ts';
import type { Load } from './types.ts';

const shipperA: SessionClaims = { sub: 'shp_A', role: 'shipper', iat: 0, exp: 9e9 };
const shipperB: SessionClaims = { sub: 'shp_B', role: 'shipper', iat: 0, exp: 9e9 };
const carrierX: SessionClaims = { sub: 'car_X', role: 'carrier', iat: 0, exp: 9e9 };

const loads: Load[] = [
  { id: 'L1', shipperId: 'shp_A', status: 'confirmed', origin: 'DAL', destination: 'HOU' },
  { id: 'L2', shipperId: 'shp_B', status: 'carrier_accepted', carrierId: 'car_X', origin: 'AUS', destination: 'SAT' },
  { id: 'L3', shipperId: 'shp_B', status: 'confirmed', origin: 'ELP', destination: 'DAL' },
];

test('requireRole enforces role', () => {
  assert.doesNotThrow(() => requireRole(shipperA, 'shipper'));
  assert.throws(() => requireRole(shipperA, 'carrier'), AuthzError);
  assert.throws(() => requireRole(null, 'shipper'), (e: unknown) => (e as AuthzError).status === 401);
});

test('shipper only sees own loads', () => {
  const scoped = scopeLoads(shipperA, loads);
  assert.deepEqual(scoped.map((l) => l.id), ['L1']);
  assert.equal(canViewLoad(shipperA, loads[1]!), false);
});

test('carrier sees assigned + open loads, not others assigned', () => {
  const scoped = scopeLoads(carrierX, loads);
  // L2 assigned to car_X; L1 & L3 are open (no carrier) -> visible on board.
  assert.deepEqual(scoped.map((l) => l.id).sort(), ['L1', 'L2', 'L3']);
});

test('carrier cannot see a load assigned to a different carrier', () => {
  const otherAssigned: Load = { id: 'L4', shipperId: 'shp_A', status: 'in_transit', carrierId: 'car_OTHER', origin: 'DAL', destination: 'OKC' };
  assert.equal(canViewLoad(carrierX, otherAssigned), false);
});

test('vetting gates carrier acceptance', () => {
  assert.equal(canCarrierAcceptLoads({ vettingStatus: 'approved' }), true);
  assert.equal(canCarrierAcceptLoads({ vettingStatus: 'in_review' }), false);
  assert.equal(canCarrierAcceptLoads({ vettingStatus: 'pending' }), false);
  assert.equal(canCarrierAcceptLoads({ vettingStatus: 'rejected' }), false);
  assert.throws(() => assertCarrierMayAccept({ vettingStatus: 'rejected' }), AuthzError);
  assert.doesNotThrow(() => assertCarrierMayAccept({ vettingStatus: 'approved' }));
});
