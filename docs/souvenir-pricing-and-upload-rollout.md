# Souvenir pricing and upload rollout

## Pricing contract

Souvenir catalogue tiers now represent a **per-piece unit rate**, not a fixed package total. For a quantity that matches a tier:

`order total = quantity × unit price`

The API accepts `unitPrice`; the backend performs multiplication in integer minor units (kobo) and persists both `unitPriceSnapshot` and `totalPriceSnapshot` on the order. Paystack initialization continues to charge the persisted `totalPriceSnapshot`, never a client-supplied estimate.

Tier ranges may not overlap. Gaps are allowed intentionally; a quantity in a gap cannot be ordered and the customer is directed to change quantity or request a custom quote. Active tiers must have a configured unit price.

## Existing catalogue data

The previous `totalPrice` values represented fixed totals for an entire quantity range. There is no mathematically reliable conversion from those values to per-piece rates without knowing the intended unit rate. The migration therefore:

- Adds nullable `SouvenirPriceTier.unitPrice`.
- Adds nullable `SouvenirOrder.unitPriceSnapshot` for historical compatibility.
- Deactivates existing active price tiers without changing their legacy `totalPrice` values or existing order snapshots.

After deploying the migration, an administrator must enter the correct **per-piece NGN rate** for each existing tier and activate it. Do not copy the old fixed total into the unit-price field unless that amount is genuinely the intended price for one piece.

## Colour selection

Customers can select between one and five unique active colours belonging to the selected product. Admins can create, edit, activate, and deactivate colour options. Orders keep colour name/hex snapshots, so later catalogue edits do not rewrite order history.

## Upload reliability

The upload mitigation uses a minimal product existence lookup, a separate primary-media lookup, bounded multipart fields/parts, and Cloudinary cleanup metadata that is stripped before Prisma writes. This reduces avoidable query and memory pressure; it does not prove that every possible PostgreSQL pool saturation cause is resolved. If Prisma P2024 continues, inspect Render instance concurrency, database connection limits, long-running queries, and pool configuration.

## Validation

Run:

`npm test`

The tests cover exact minor-unit multiplication, quantity bounds, invalid rates, and database decimal overflow. Run the repository's normal CI/build checks and verify uploads against the deployed Render service after merge/deploy.
