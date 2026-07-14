# RJS / McLeod seed ingestion (END-56)

Documented, **idempotent** import that replaces the stubbed seed with a real
RJS/McLeod carrier + shipper export. `foundations` owns its own data layer —
there is **no shared database** with `rjs-platform`. We ingest their McLeod
export into our store.

## Data shapes

The importer consumes a JSON export whose rows mirror McLeod's `carrier` and
`customer` tables (subset in `lib/ingest/mcleod.ts`):

```jsonc
{
  "carriers": [
    { "id", "dot_number", "mc_number", "name", "dba_name", "email", "phone" }
  ],
  "customers": [
    { "id", "customer_id", "name", "email", "phone", "bill_to_address" }
  ]
}
```

A sample lives at [`seed/rjs-mcleod-export.sample.json`](../seed/rjs-mcleod-export.sample.json).
Place the **real** export at `seed/rjs-mcleod-export.json` (git-ignored — it
contains partner PII).

## Natural keys & idempotency

Records are upserted by natural key, so re-running the same export **converges**
instead of duplicating:

| Entity  | Natural key            | Stable id           |
| ------- | ---------------------- | ------------------- |
| Carrier | `dot_number`           | `car_<sha1(dot)>`   |
| Shipper | `customer_id` (or `id`)| `shp_<sha1(custId)>`|

On update we preserve the original `id` and `onboardedAt`, so downstream
references never churn. Rows missing/invalid on their natural key are **skipped
and reported** (`ImportReport.errors`), never silently dropped — the rest of the
batch still imports. Ids are derived by hashing the natural key (no randomness,
no wall-clock), so imports are fully reproducible — the property the test suite
and the "known fixture seed" strategy rely on.

## Vetting on ingest

Every carrier is run through the FMCSA/DOT vetting hook (`lib/vetting/fmcsa.ts`)
**before** upsert, so `vetting_status` is populated at import time:

- `approved` — active authority, not out-of-service, insurance on file
- `in_review` — authority OK but insurance unverified (needs human ops), or the
  FMCSA lookup errored (we fail **closed** to review, never auto-approve)
- `rejected` — out-of-service, not allowed to operate, or no FMCSA record

Only `approved` carriers can accept loads (`lib/authz.ts#canCarrierAcceptLoads`).

## Running

```bash
# Dry-run against the sample fixture (offline; InMemory store + stub FMCSA):
npm run import:seed

# Real export:
npm run import:seed -- seed/rjs-mcleod-export.json
```

The CLI prints an `ImportReport` (`created` / `updated` / `skipped` / `errors`)
plus a vetting summary. Running it twice in a row yields `created: 0` the second
time — the idempotency guarantee.

## Wiring the production data layer

`scripts/import-seed.ts` binds the `InMemoryDataStore` and a `StubFmcsaClient`
so it runs offline in CI/dev. In production, swap:

- `InMemoryDataStore` → the Postgres-backed `DataStore` (Neon prod / Docker dev),
  implementing the same `lib/ingest/store.ts` interface.
- `StubFmcsaClient` → a live client hitting the FMCSA QCMobile/SAFER API,
  implementing `lib/vetting/fmcsa.ts#FmcsaClient`.

No business logic changes — both are ports behind interfaces.
