/**
 * Shipper + carrier self-serve onboarding.
 *
 * Shipper onboarding is lightweight. Carrier onboarding runs the FMCSA/DOT
 * vetting hook so a carrier's `vetting_status` is set the moment they sign up —
 * gating whether they can accept loads (see authz.canCarrierAcceptLoads).
 */

import { createHash } from 'node:crypto';
import type { Carrier, Shipper } from './types.ts';
import type { DataStore } from './ingest/store.ts';
import { vetCarrier, type FmcsaClient } from './vetting/fmcsa.ts';

function deterministicId(prefix: string, naturalKey: string): string {
  return `${prefix}_${createHash('sha1').update(naturalKey).digest('hex').slice(0, 16)}`;
}

export interface ShipperSignup {
  mcleodCustomerId?: string;
  name: string;
  email: string;
  phone?: string;
  billingAddress?: string;
}

export interface CarrierSignup {
  dotNumber: string;
  mcNumber?: string;
  legalName: string;
  dbaName?: string;
  email: string;
  phone?: string;
}

export interface OnboardOptions {
  now?: () => string;
}

export async function onboardShipper(
  input: ShipperSignup,
  store: DataStore,
  opts: OnboardOptions = {},
): Promise<Shipper> {
  if (!input.name?.trim()) throw new Error('onboardShipper: name required');
  if (!input.email?.trim()) throw new Error('onboardShipper: email required');
  const now = opts.now?.() ?? new Date().toISOString();
  const mcleodCustomerId = input.mcleodCustomerId?.trim() || deterministicId('signup', `email:${input.email}`);

  const shipper: Shipper = {
    id: deterministicId('shp', `mcleod:${mcleodCustomerId}`),
    mcleodCustomerId,
    name: input.name.trim(),
    email: input.email.trim(),
    ...(input.phone?.trim() ? { phone: input.phone.trim() } : {}),
    ...(input.billingAddress?.trim() ? { billingAddress: input.billingAddress.trim() } : {}),
    onboardedAt: now,
    source: 'signup',
  };
  await store.upsertShipper(shipper);
  return shipper;
}

export async function onboardCarrier(
  input: CarrierSignup,
  store: DataStore,
  fmcsa: FmcsaClient,
  opts: OnboardOptions = {},
): Promise<{ carrier: Carrier; vettingReasons: string[] }> {
  if (!input.legalName?.trim()) throw new Error('onboardCarrier: legalName required');
  if (!input.email?.trim()) throw new Error('onboardCarrier: email required');
  if (!/^\d+$/.test(input.dotNumber ?? '')) throw new Error('onboardCarrier: valid dotNumber required');
  const now = opts.now?.() ?? new Date().toISOString();

  const decision = await vetCarrier(input.dotNumber, fmcsa);

  const carrier: Carrier = {
    id: deterministicId('car', `dot:${input.dotNumber}`),
    dotNumber: input.dotNumber,
    ...(input.mcNumber?.trim() ? { mcNumber: input.mcNumber.trim() } : {}),
    legalName: input.legalName.trim(),
    ...(input.dbaName?.trim() ? { dbaName: input.dbaName.trim() } : {}),
    email: input.email.trim(),
    ...(input.phone?.trim() ? { phone: input.phone.trim() } : {}),
    vettingStatus: decision.status,
    vettedAt: now,
    onboardedAt: now,
    source: 'signup',
  };
  await store.upsertCarrier(carrier);
  return { carrier, vettingReasons: decision.reasons };
}
