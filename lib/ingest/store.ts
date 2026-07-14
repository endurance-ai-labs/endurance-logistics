/**
 * The data layer owned by `foundations`. There is NO shared DB with
 * rjs-platform — we ingest their McLeod export into our own store.
 *
 * `DataStore` is the persistence port. The Next.js app binds a Postgres-backed
 * implementation (Neon in prod, Docker in dev); the importer and tests use the
 * in-memory implementation so ingestion logic can be verified without a DB.
 */

import type { Carrier, Shipper } from '../types.ts';

export interface DataStore {
  /** Upsert by natural key (DOT number). Returns whether a row was created. */
  upsertCarrier(carrier: Carrier): Promise<{ created: boolean }>;
  upsertShipper(shipper: Shipper): Promise<{ created: boolean }>;
  getCarrierByDot(dotNumber: string): Promise<Carrier | undefined>;
  getShipperByMcleodId(mcleodCustomerId: string): Promise<Shipper | undefined>;
  listCarriers(): Promise<Carrier[]>;
  listShippers(): Promise<Shipper[]>;
}

export class InMemoryDataStore implements DataStore {
  private readonly carriers = new Map<string, Carrier>(); // key: dotNumber
  private readonly shippers = new Map<string, Shipper>(); // key: mcleodCustomerId

  async upsertCarrier(carrier: Carrier): Promise<{ created: boolean }> {
    const existing = this.carriers.get(carrier.dotNumber);
    // Preserve the original id + onboardedAt on update so imports are idempotent
    // and don't churn stable identifiers.
    const merged: Carrier = existing
      ? { ...carrier, id: existing.id, onboardedAt: existing.onboardedAt }
      : carrier;
    this.carriers.set(carrier.dotNumber, merged);
    return { created: !existing };
  }

  async upsertShipper(shipper: Shipper): Promise<{ created: boolean }> {
    const existing = this.shippers.get(shipper.mcleodCustomerId);
    const merged: Shipper = existing
      ? { ...shipper, id: existing.id, onboardedAt: existing.onboardedAt }
      : shipper;
    this.shippers.set(shipper.mcleodCustomerId, merged);
    return { created: !existing };
  }

  async getCarrierByDot(dotNumber: string): Promise<Carrier | undefined> {
    return this.carriers.get(dotNumber);
  }
  async getShipperByMcleodId(mcleodCustomerId: string): Promise<Shipper | undefined> {
    return this.shippers.get(mcleodCustomerId);
  }
  async listCarriers(): Promise<Carrier[]> {
    return [...this.carriers.values()];
  }
  async listShippers(): Promise<Shipper[]> {
    return [...this.shippers.values()];
  }
}
