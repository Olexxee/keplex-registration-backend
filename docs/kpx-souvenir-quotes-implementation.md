# KPX Academy — Souvenir Quotation Workflow

## Scope

This workflow extends custom souvenir enquiries. It lets an admin create a versioned quotation with itemized prices, attach reference media, publish it to the customer's secure enquiry page, and let the guest accept or decline it without creating an account.

**No Prisma migration was generated or applied.** The schema changes are committed in source control; create and apply migrations locally after pulling the branch.

## API

All paths below are relative to `/api/souvenirs`.

### Admin — authenticated with ADMIN or SUPER_ADMIN

- `POST /admin/enquiries/:id/quotes` — create a draft quote.
- `POST /admin/enquiries/:id/quotes/:quoteId/media` — attach up to 10 reference media files using multipart field `media`.
- `POST /admin/enquiries/:id/quotes/:quoteId/send` — publish a draft quote to the customer's secure enquiry page.

Create quote request:

```json
{
  "currency": "NGN",
  "message": "We can recreate this design using your requested colours.",
  "terms": "50% deposit required before production. Final delivery date is confirmed after payment.",
  "expiresAt": "2026-10-30T23:59:59.000Z",
  "items": [
    {
      "name": "Custom souvenir production",
      "description": "Custom print and finishing",
      "quantity": 30,
      "unitPrice": 2500,
      "displayOrder": 0
    },
    {
      "name": "Design setup",
      "quantity": 1,
      "unitPrice": 15000,
      "displayOrder": 1
    }
  ]
}
```

Prices are authoritative server-calculated values from the submitted admin quote. Line totals are calculated as unit price × quantity and the quote total is the sum of line totals. Only NGN is currently supported. A quote must have at least one item; quantity must be a positive integer. Expiry is optional, but if provided it must be in the future.

The create endpoint returns a **DRAFT** quote. Attach any reference media while it is still a draft, then call the send endpoint. A sent quote is immutable through this workflow; create a new version if the terms or price need to change. Sending a new quote supersedes the previous sent quote.

### Guest — secure token, no account required

- `GET /enquiries/access/:token` — now includes the latest customer-visible quote (never a draft).
- `POST /enquiries/access/:token/quote-response` — accept or decline the current sent quote.

Request:

```json
{
  "quoteId": "quote-id-from-the-enquiry-page",
  "decision": "ACCEPT"
}
```

`decision` is `ACCEPT` or `DECLINE`. The quote must belong to the enquiry identified by the access token, must be in `SENT` state, and must not be expired. A response updates both the quote and enquiry status in one transaction. The access token itself is never stored in plaintext; only its SHA-256 hash is stored.

## Quote states

- `DRAFT`: created by an admin; not visible to the guest.
- `SENT`: published on the secure enquiry page and awaiting the guest's decision.
- `ACCEPTED` / `DECLINED`: guest decision recorded.
- `EXPIRED`: guest tried to respond after expiry.
- `SUPERSEDED`: replaced by a newer sent quote.

The enquiry moves to `UNDER_REVIEW` when the first draft is created, `RESPONDED` when a quote is sent, and `ACCEPTED` or `DECLINED` after the guest responds.

## Media

Reference files are uploaded to Cloudinary under `keplex/souvenirs/quotes`. The existing upload policy permits JPEG, PNG, WEBP, GIF, MP4, WEBM, and MOV; each file is limited to 10 MB, with at most 10 files per request. If database persistence fails after upload, the service attempts to remove the uploaded Cloudinary assets.

## Delivery limitation

The send endpoint publishes the quote to the enquiry's secure guest page. **It does not yet send email or WhatsApp notifications.** Those delivery integrations should be added as a separate reliable notification step; notification failure should not roll back the saved quote.

## Schema additions

- `SouvenirQuote`: version, status, currency, total, terms/message, expiry and response timestamps.
- `SouvenirQuoteItem`: item description, quantity, unit price and calculated line total snapshots.
- `SouvenirQuoteMedia`: Cloudinary reference media metadata.
- `SouvenirQuoteStatus`: DRAFT, SENT, ACCEPTED, DECLINED, EXPIRED, SUPERSEDED.

## Local verification / migration

After pulling the branch, run schema validation and generate/apply the migration locally according to the repository's normal workflow. No migration or database change has been run by this implementation.
