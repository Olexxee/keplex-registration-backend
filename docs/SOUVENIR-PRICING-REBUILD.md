# Souvenir Pricing Rebuild — Architecture and Delivery Plan

**Status:** Phase 1 schema foundation merged; Phase 2 backend schedule API in implementation  
**Scope:** KPX Academy souvenir pricing subsystem across `keplex-registration-backend` and `kpx-academy`  
**Primary objective:** Replace the current isolated tier CRUD workflow with a versioned, atomically managed quantity-pricing schedule. Eliminate ambiguous range semantics and protect historical orders.

---

## 1. Executive decision

Rebuild the **pricing subsystem**, including its database representation, backend API/service/validation, admin pricing interface, public price display, and order-tier selection.

Do not rewrite unrelated souvenir functionality without evidence that it is necessary. Product catalogue data, product media, colour options, customer orders, payments, custom-design enquiries, quotes, and their associated customer flows remain in scope for regression testing and data preservation, not wholesale deletion.

The pricing model will use:

- Per-piece prices in NGN.
- Inclusive integer quantity ranges.
- One open-ended final band for each valid current schedule.
- Contiguous ranges after the schedule's configured starting quantity.
- A generated display label; administrators do not separately maintain a label that can contradict the range.
- Versioned schedules. A save replaces the current schedule atomically and retains prior versions for auditability.
- Immutable order snapshots. An order's charged price must never change when an administrator edits a future schedule.

Example only (not approved business prices or required quantity boundaries):

| Band | Minimum | Maximum | Display |
|---|---:|---:|---|
| 1 | 20 | 50 | 20–50 |
| 2 | 51 | 100 | 51–100 |
| 3 | 101 | 150 | 101–150 |
| Final | 151 | NULL | 151+ |

The first minimum is configurable per product. Do not assume every product starts at 1 or 20.

## 2. Verified diagnosis from the current main branches

The recurring production/development conflict is consistent with a mismatch between the stored range and its label:

- `SouvenirPriceTier.maxQuantity` is nullable in Prisma.
- The backend's `assertFiniteTierRange` currently rejects a null maximum for create, update, and activation.
- The Zod create schema requires an integer `maxQuantity`.
- The admin UI requires a maximum quantity when creating and editing a tier.
- The UI displays the administrator-provided `label`, separately from the numeric boundaries.
- The overlap helper correctly interprets a null maximum as unbounded. Therefore a row labelled `20-50` with `minQuantity = 20` and `maxQuantity = NULL` is actually `20+` and overlaps every higher active range.
- The current service already takes a PostgreSQL product-level advisory transaction lock before tier mutations. Do not describe the current implementation as lacking all concurrency protection.
- There is no database exclusion constraint preventing overlapping current/active ranges if data is written outside the service or a future code path bypasses the lock.
- `SouvenirOrder.priceTierId` is currently a nullable string, not a Prisma relation. The order also stores product, tier-label, quantity, unit-price, and total-price snapshots. The service separately counts orders referencing a tier before allowing deletion.

This is not adequately fixed by changing the conflict message, renaming the tier, or deleting one offending row. The current CRUD shape allows a partially edited collection of independent records to represent what should be one coherent schedule.

## 3. Target data model

### 3.1 Versioned price bands

Redesign `SouvenirPriceTier` as versioned schedule bands. Target fields:

| Field | Target meaning |
|---|---|
| `id` | Stable band record identifier |
| `productId` | Owning souvenir product |
| `version` | Schedule version this band belongs to |
| `minQuantity` | Inclusive lower bound; positive integer |
| `maxQuantity` | Inclusive upper bound; nullable only for the final open-ended band |
| `unitPrice` | Required positive per-piece NGN amount |
| `currency` | NGN for current supported checkout |
| `isCurrent` | Whether this band belongs to the current schedule |
| `createdAt`, `updatedAt` | Audit timestamps |

Remove the misleading/redundant `label`, legacy fixed-tier `totalPrice`, and per-band `active`/manual ordering semantics after migration compatibility has been addressed. The display label is generated from the numeric bounds. Sort by `minQuantity`.

Add `pricingVersion` to `SouvenirProduct` (default 0 for migrated products). A successful schedule replacement increments it once and creates all bands with the new version. Historical bands remain with `isCurrent = false`; they are not offered to customers.

If implementation discovers a reason that makes this exact model unsafe with the existing Prisma schema or data, document the reason and propose the smallest compatible adjustment before changing the design.

### 3.2 Database invariants

Enforce these invariants in both application validation and PostgreSQL:

1. `minQuantity >= 1`.
2. A finite `maxQuantity` must be greater than or equal to `minQuantity`.
3. A current schedule has exactly one open-ended band, and it is the final band.
4. Current bands are sorted, contiguous, and non-overlapping: each next minimum is previous maximum + 1.
5. All current bands for one product belong to the product's current `pricingVersion`.
6. Current bands have a positive `unitPrice` and supported currency.
7. A published product must have a complete valid current schedule.
8. A product must not become publicly orderable while its schedule is empty or invalid.
9. Historical bands are immutable through normal admin endpoints.

Use PostgreSQL constraints for row-level invariants and a GiST exclusion constraint for current-band overlap. Enable `btree_gist` in a migration if required. The exclusion constraint should scope to the same product and current bands, using an inclusive integer range expression so adjacent bands (for example 20–50 and 51–100) do not overlap. A nullable upper bound must represent an unbounded final range. Keep application validation because it can return actionable errors; database constraints are the final integrity barrier.

A database CHECK constraint cannot by itself guarantee cross-row contiguity or exactly one open-ended final band. Enforce those schedule-wide invariants in the transactional replacement service, and use a deferred constraint trigger only if implementation testing demonstrates it is needed to protect other database write paths. Do not pretend a simple CHECK constraint solves cross-row rules.

## 4. Schedule API and service design

Replace isolated create/update/activate/deactivate operations with a schedule-level operation.

### Admin read

Return:
- Product identifier and name.
- Current pricing version.
- Current bands in ascending quantity order.
- Generated labels.
- Whether the schedule is valid and whether the product is currently publishable.
- Historical schedule versions only where the admin audit view needs them.

### Admin replace

One request submits the complete desired schedule for a product, not one band at a time.

The service must:
1. Validate the product exists.
2. Acquire the existing product-scoped PostgreSQL advisory transaction lock.
3. Read and verify the expected current version (optimistic concurrency check).
4. Validate the complete submitted schedule before writing.
5. Confirm all current bands are contiguous and exactly one final band is open-ended.
6. Increment the version.
7. Mark the previous current bands as historical.
8. Insert the complete new set as current.
9. Validate the resulting schedule and product publication state.
10. Commit all changes together or roll back all of them.

Reject stale edits with a clear conflict response that tells the admin to reload the latest schedule. A failed replacement must leave the previous schedule fully intact.

No public endpoint may accept a client-supplied unit price or tier identifier as the authoritative total. The backend must resolve the unique matching current band for the requested quantity and calculate the total itself.

### Public and order behaviour

- Public catalogue returns only current bands.
- Quantity selection must match exactly one current band.
- Quantities below the configured first minimum are rejected with a clear minimum-order message.
- Gaps, overlaps, duplicate matches, or missing final bands make a schedule invalid; do not silently choose the first match.
- New orders snapshot the selected band ID, schedule version, minimum and maximum boundaries, generated label, unit price, quantity, total, currency, product name, booking terms, and lead time.
- Existing order snapshots remain unchanged and are the source of truth for historical charges.
- Payment initialization and verification continue to use the immutable order total, never a newly recalculated catalogue price.

Keep currency arithmetic aligned with the existing backend money policy and Decimal handling. Do not introduce floating-point arithmetic for persisted money.

## 5. Frontend rebuild

Replace the current tier-by-tier forms in the admin souvenir page with a **single schedule editor**.

### Admin experience

- Show the current schedule version and a clear valid/invalid state.
- Edit the complete schedule in one draft form.
- Add and remove bands locally before saving.
- Edit each band's minimum, maximum, and per-piece price.
- Provide an explicit “Final band — no upper limit” control. Only the last band may use it.
- Generate labels from the numeric range; do not ask admins to type labels.
- Display the full schedule preview before save.
- Validate gaps, overlaps, invalid boundaries, duplicate final bands, empty prices, and invalid currency before submitting.
- Save all changes with one request and show per-field/server validation errors.
- Warn on stale schedule versions and require reload rather than silently overwriting another admin's changes.
- Do not expose independent activate/deactivate controls for individual bands. The schedule is the atomic unit.
- Do not allow publishing a product until a valid schedule exists.
- Keep product details, media, colour options, enquiries, and orders usable; pricing redesign must not regress them.
- Provide responsive layouts and accessible labels, keyboard operation, loading/empty/error/success states.

### Public experience

- Display generated quantity ranges and per-piece rates clearly.
- Ensure the selected quantity resolves to one band.
- Update the displayed estimate from the selected band, but treat the backend order response as authoritative.
- Handle quantities below minimum and unavailable/invalid schedules explicitly.
- Preserve existing colour selection, customer contact, terms, and checkout behaviour.

## 6. Migration and cleanup strategy

**No destructive production cleanup is authorised by this specification.** Migration must be reviewed and executed deliberately.

### Pre-migration inventory

Before schema changes:
- Count products, price tiers, active tiers, inactive tiers, null maxima, null unit prices, and tiers with legacy `totalPrice`.
- Identify products with no current valid pricing.
- Identify all orders with a non-null `priceTierId`.
- Compare each order's stored `priceTierLabelSnapshot`, `quantity`, `unitPriceSnapshot`, and `totalPriceSnapshot`.
- Export a recoverable backup of the affected tables and retain the migration report.
- Record current product publication status and tier configuration.

### Migration approach

1. Add new versioning and snapshot columns in a backward-compatible migration.
2. Preserve all existing order and payment rows.
3. Mark existing tier rows as historical (`isCurrent = false`) rather than exposing ambiguous legacy rows as the new schedule.
4. Preserve existing tier IDs and order references as audit data; do not delete rows referenced by orders.
5. Set each product's current pricing version to a known baseline.
6. Do not automatically infer a finite maximum from a label. A label is not authoritative data.
7. Do not automatically convert a null maximum to a guessed finite value.
8. Do not automatically activate legacy prices. Products without a manually reviewed new schedule remain unpublished/unorderable until configured.
9. Backfill new order snapshot fields only where the value can be derived unambiguously. Keep existing snapshots untouched.
10. Add database constraints only after the legacy data has been isolated from current schedules and the preflight checks pass.
11. Verify row counts, order/payment totals, product/media/colour counts, and referential integrity before considering the migration complete.

The old pricing rows can remain as historical records. If storage cleanup is later required, it must be a separate, explicitly reviewed operation with a verified backup and proof that no order or payment audit depends on the rows.

### Rollback

- Take and verify a database backup before migration.
- Use additive/expand migrations first.
- Keep the previous application release deployable until the new schema and API are verified.
- Do not use a destructive down migration that drops order snapshots or historical price data.
- If rollback is needed after new schedules have been written, roll back application behaviour without deleting the new schedule history. Any schema contraction must wait for a separately approved migration.

## 7. Test plan and acceptance criteria

### Backend unit tests

- Valid finite band followed by final open-ended band.
- Adjacent ranges accepted.
- Gaps rejected.
- Overlaps rejected.
- Two open-ended bands rejected.
- Open-ended band before another band rejected.
- Empty schedule rejected for publication.
- Non-positive prices rejected.
- Unsupported currency rejected.
- Minimum quantity below 1 rejected.
- Invalid maximum rejected.
- Labels generated correctly.
- Quantity at each lower and upper boundary maps to exactly one band.
- Quantity below the first minimum is rejected.
- Large quantity boundary and integer overflow cases are handled safely.

### Backend integration tests

- Schedule replacement is atomic.
- A validation failure leaves the previous schedule untouched.
- A stale version cannot overwrite a newer schedule.
- Concurrent replacement attempts serialize and one stale writer receives a conflict.
- PostgreSQL rejects direct overlapping current bands.
- PostgreSQL accepts adjacent current bands.
- Product publication is rejected without a valid current schedule.
- Product cannot be ordered when unpublished or schedule-invalid.
- Order total is calculated server-side.
- Later schedule replacement does not change old order snapshots.
- Payment initialization uses the order's immutable snapshot total.

### Frontend tests

- Build a complete schedule from scratch.
- Add, edit, and remove bands.
- Mark only the final band open-ended.
- Preview generated labels.
- Catch gaps and overlaps before submit.
- Handle backend validation and stale-version conflicts.
- Confirm the previous schedule remains visible after a failed save.
- Verify responsive admin editor and accessible controls.
- Public quantity selection resolves the same band as the backend.
- Product details, images, colours, enquiries, order submission, and checkout remain functional.

### End-to-end acceptance

Do not declare the rebuild complete until:
- CI passes in both repositories.
- Migration preflight and migration are verified against a non-production copy first.
- Admin can create and replace a full schedule.
- Public catalogue displays the new schedule.
- Boundary quantities select the correct per-piece price.
- A real test order persists correct snapshots and total.
- A later price change leaves the existing order and payment amount unchanged.
- Production data counts and key records reconcile after deployment.

## 8. Delivery phases

| Phase | Repository | Deliverable |
|---|---|---|
| 0. Specification | Backend docs | This approved design and migration plan |
| 1. Schema and migration | Backend | Versioned pricing model, safe expand/backfill migration, database invariants |
| 2. Pricing domain/API | Backend | Atomic schedule read/replace, validation, order integration, unit/integration tests |
| 3. Admin editor | Frontend | Full schedule editor and preview, stale-version handling |
| 4. Public and checkout integration | Both | Current schedule display, quantity matching, immutable order/payment snapshots |
| 5. Verification | Both | Regression, migration rehearsal, deployment checks, production reconciliation |

Implementation is split into separate PRs per repository/phase. The user reviews and merges PRs; no PR is merged by the assistant.

## 9. Explicit non-goals

- Do not delete souvenir products, product media, colour options, customer orders, payment records, enquiries, or quotes as part of pricing cleanup.
- Do not change souvenir colour selection rules or the customer colour palette feature unless regression testing reveals a direct dependency.
- Do not redesign the unrelated souvenir enquiry/quotation workflow.
- Do not change Cloudinary storage strategy.
- Do not guess quantity bands or business prices. The admin configures those values.
- Do not use a tier's display label as the source of truth.
- Do not treat a frontend-only overlap check as data integrity.
- Do not patch production records manually to hide the current 409 without first validating the full schedule.

## 10. Current implementation checkpoint

- [x] Current backend schema, pricing service, Zod validation, database helpers, and order snapshot flow inspected.
- [x] Current admin souvenir pricing forms inspected.
- [x] Root cause of the `20-50` versus `20+` conflict identified.
- [x] Target schedule-level replacement architecture defined.
- [x] Data preservation and migration strategy defined.
- [x] Specification merged.
- [x] Schema foundation and expand-only migration implemented; read-only preflight supplied; production rehearsal pending.
- [ ] Backend API and tests implemented.
- [ ] Frontend schedule editor implemented.
- [ ] Public/order flow regression passed.
- [ ] Production migration and acceptance verified.

### Phase 2 implementation checkpoint — backend schedule API

The Phase 2 branch introduces the following contract and behaviour:

- `GET /api/souvenirs/admin/products/:id/pricing-schedule` returns the product's current version and current bands.
- `PUT /api/souvenirs/admin/products/:id/pricing-schedule` accepts `{ expectedVersion, bands: [{ minQuantity, unitPrice }] }` and replaces the complete schedule atomically.
- Each band's maximum is derived as the next band's minimum minus one. The final band is always open-ended. Administrators cannot submit a separately editable maximum or label.
- The backend generates labels, normalizes per-piece prices to two decimal places, and fixes currency to NGN.
- The existing product-scoped advisory transaction lock is reused. A stale `expectedVersion` returns HTTP 409; old current rows are archived and the new version is inserted in the same transaction.
- Public catalogue queries and guest order creation now select `isCurrent` rows. Products without a current schedule are not listed publicly and cannot be ordered.
- Product publication now requires a structurally valid current schedule.
- Order creation records the selected band version and inclusive boundaries alongside the existing immutable unit/total price snapshots. Payment initialization continues to use the persisted order amount.
- Individual tier create/update/activate/delete operations now return a conflict directing clients to the schedule-level API. They can no longer mutate pricing independently.
- Pure schedule and request-validation tests cover derived ranges, generated labels, open-ended final bands, price precision, ordering, version consistency, and contiguous range validation.

Important verification boundary: this branch adds a PostgreSQL 16 workflow that applies every migration to a clean database, then exercises atomic replacement, stale-version rejection, invalid-write rollback, concurrent writers, historical-version retention, and direct overlapping-write rejection. Its result is pending. A production-database migration rehearsal remains required before deployment. The frontend still needs Phase 3 integration before administrators can manage schedules through the deployed UI.