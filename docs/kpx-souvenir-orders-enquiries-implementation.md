# KPX Souvenir Orders and Custom Enquiries

This phase implements guest souvenir ordering and custom-design enquiry intake on top of the admin-controlled souvenir catalogue.

## Standard souvenir order

### Public endpoint

`POST /api/souvenirs/orders`

Example JSON:

```json
{
  "customerName": "Ada Example",
  "customerEmail": "ada@example.com",
  "customerWhatsApp": "+2348012345678",
  "productId": "souvenir_product_id",
  "quantity": 30,
  "colorOptionIds": ["active_color_id_1", "active_color_id_2"],
  "customerNotes": "Please confirm the production lead time."
}
```

The API:
- Requires an active product and active price tier matching the requested quantity.
- Uses the tier's server-side total price and currency; client-provided prices are not accepted.
- Requires 1–3 distinct colour IDs, each belonging to the chosen product and currently active.
- Stores product, package, price, terms, and lead-time snapshots on the order.
- Stores each selected colour's name, hex value, and swatch URL snapshot. Disabling or renaming a catalogue colour later does not alter an existing order.
- Creates a guest access token, stores only its SHA-256 hash, and returns the raw token once with a public reference. The customer must retain the token; the reference alone cannot retrieve the order.

The selected quantity must fall into a configured active tier. The tier's configured total is the authoritative price for that range. KPX should configure tiers carefully; the API does not extrapolate prices.

### Guest order access

`GET /api/souvenirs/orders/access/:token`

Returns a safe order summary without email, WhatsApp number, admin notes, or token hash.

### Admin order endpoints

All require the existing ADMIN or SUPER_ADMIN role.

- `GET /api/souvenirs/admin/orders?page=1&limit=20&status=SUBMITTED`
- `GET /api/souvenirs/admin/orders/:id`
- `PATCH /api/souvenirs/admin/orders/:id`

Patch example:

```json
{
  "status": "AWAITING_PAYMENT",
  "adminNotes": "Confirm artwork before production."
}
```

Order status transitions are checked in the service. The admin endpoint cannot mark an order PAID; that status must be introduced by the future verified payment flow.

## Custom-design enquiry

### Public endpoint

`POST /api/souvenirs/enquiries` as multipart form data.

Text fields:
- `customerName`
- `customerEmail`
- `customerWhatsApp`
- `designDescription` (required, at least 10 characters)
- `productId` (optional, if the enquiry relates to an existing catalogue item)
- `requestedQuantity` (optional)

Attach up to 10 files using the repeated field name `media`. Accepted types follow the existing upload middleware (JPEG, PNG, WEBP, GIF, MP4, WEBM, MOV); each file is limited to 10 MB for this endpoint. Files are uploaded to Cloudinary under `keplex/souvenirs/enquiries`. If database persistence fails after upload, the service attempts to remove uploaded assets to avoid orphans.

The response includes a public reference, initial status, media count, and one-time guest access token. Only the token hash is stored in PostgreSQL.

### Guest enquiry access

`GET /api/souvenirs/enquiries/access/:token`

Returns the enquiry description, status, any admin response message, and the customer's submitted reference media. It does not expose customer contact details or internal admin notes.

### Admin enquiry endpoints

All require ADMIN or SUPER_ADMIN.

- `GET /api/souvenirs/admin/enquiries?page=1&limit=20&status=NEW`
- `GET /api/souvenirs/admin/enquiries/:id`
- `PATCH /api/souvenirs/admin/enquiries/:id`

Patch example:

```json
{
  "status": "RESPONDED",
  "adminNotes": "Design is feasible; confirm material availability.",
  "responseMessage": "We can recreate this design. We will follow up with the final quotation."
}
```

The response message is recorded for the secure guest view; this phase does not send emails or WhatsApp messages. Quotation line items, quotation versioning, and actual notification delivery remain the next implementation phase.

## Security and implementation notes

- Guest orders and enquiries do not require customer accounts.
- Access tokens are generated with cryptographic randomness; only SHA-256 hashes are persisted.
- Customer writes use Zod validation. Admin endpoints use the existing auth and role middleware.
- Reference uploads are bounded to 10 files of 10 MB each.
- Product and price changes do not overwrite historical order snapshots.
- No migration has been generated or applied. The repository owner will run Prisma validation, generate the migration, inspect it, and apply it locally.
