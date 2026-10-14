# KPX Souvenir Catalogue — Initial Implementation

This implementation adds the first runtime slice of the approved blueprint: admin-controlled souvenir products, sample-image metadata, selectable colour options, and explicit quantity-based package pricing. It does not yet implement guest orders, custom enquiries, quotation negotiation, workshops, payments, or the frontend.

## Colour palette rules

- Each souvenir product owns its own colour options.
- A colour option stores a display name, six-digit hex value, optional swatch image URL/provider public ID, active flag, and display order.
- Public catalogue responses expose active colour options only; admin responses include inactive options.
- Disabling a colour preserves the record and affects future selections only.
- A reusable Zod schema and service validator now enforce one to three distinct colour option IDs, verify that each option belongs to the selected product and is active, and return colour-name/hex snapshots for persistence. The eventual order endpoint must call this validator and persist those snapshots; order creation itself is not part of this implementation slice.

## Price tiers

- Every product has admin-configured quantity ranges with an explicit total package price and currency.
- Example: minimum 30 pieces, maximum 59 pieces, total price NGN 45,000.
- A null maximum means the range has no upper limit.
- Quantity ranges for a product cannot overlap. The API does not infer proportional pricing.
- A product cannot be published until at least one active price tier exists.
- Newly created products are inactive so the admin can configure price tiers, colours, and images before publishing.

## Media

Product sample images reference assets already uploaded to the approved media provider, using a URL and provider public ID. These endpoints manage metadata only; they do not upload or delete Cloudinary assets.

## Public endpoints

- GET /api/souvenirs
- GET /api/souvenirs/:slug

## Admin endpoints

All admin endpoints require ADMIN or SUPER_ADMIN.

- GET /api/souvenirs/admin/products
- POST /api/souvenirs/admin/products
- PATCH /api/souvenirs/admin/products/:id
- PATCH /api/souvenirs/admin/products/:id/status
- POST /api/souvenirs/admin/products/:id/colors
- PATCH /api/souvenirs/admin/colors/:colorId
- PATCH /api/souvenirs/admin/colors/:colorId/status
- POST /api/souvenirs/admin/products/:id/price-tiers
- PATCH /api/souvenirs/admin/price-tiers/:tierId
- PATCH /api/souvenirs/admin/price-tiers/:tierId/status
- POST /api/souvenirs/admin/products/:id/media
- PATCH /api/souvenirs/admin/media/:mediaId

## Migration ownership

The Prisma schema has been updated only in source control. No migration has been generated or applied. The repository owner will generate, inspect, and apply the migration locally.