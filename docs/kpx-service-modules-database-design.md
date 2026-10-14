# KPX Academy Service Modules — Database Design

Status: design proposal for review. This document does not change the Prisma schema or database.

## Goals

Add creative workshops, souvenir ordering, and appointment booking to the existing Express 5 / Prisma 6 / PostgreSQL API while preserving training registration, admin authentication, and Paystack verification.

## Design rules

- Guests can submit bookings and orders without accounts.
- Every guest request stores a contact snapshot (name, email, phone) on its own business record. Do not create a required customer-account model.
- Use the existing route → controller → service → database-layer pattern and Zod route validation.
- Store money as PostgreSQL Decimal(12,2) with currency. Snapshot prices and item descriptions on order/booking lines so catalogue edits do not rewrite history.
- Admin operations use existing authMiddleware and roleMiddleware("ADMIN", "SUPER_ADMIN").
- Keep existing training registration endpoints and semantics working.
- Payment success is determined only by server-side Paystack verification; webhook handling remains signature-verified and idempotent.

## Domain A — Workshops

### WorkshopType
Catalogue entry for a bookable activity, e.g. resin art, crafts, lip-care formulation, or a combined experience. Fields include title, slug, description, active/display order, optional duration, and optional indicative price.

### WorkshopBooking
A guest's event request: unique public reference, guest name/email/phone, status, preferred date/time window, participant count, venue mode (CLIENT_VENUE, KPX_VENUE, TO_BE_ARRANGED), venue address/city, notes, and timestamps.

### WorkshopBookingItem
Join between a booking and each requested WorkshopType. Store participant count and a title/price snapshot. This allows combined activities in one event request.

### WorkshopQuote / WorkshopQuoteItem
A versioned quotation attached to a booking, with expiry, currency, status (DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED), line descriptions, quantities, unit-price snapshots, and totals. Accepting a quote records acceptance; it does not by itself mark the event as paid or completed.

### WorkshopBookingStatusHistory
Append-only record of status transitions, actor (admin or system), reason, and timestamp.

Suggested booking lifecycle: REQUESTED → QUOTED → AWAITING_PAYMENT / CONFIRMED → COMPLETED; with DECLINED, CANCELLED, and EXPIRED terminal/exception paths as applicable. The service layer enforces valid transitions.

## Domain B — Souvenirs

### SouvenirCategory
Name, slug, active/display order.

### SouvenirProduct
Name, slug, description, category, active/featured flags, order/display metadata, and catalogue media references.

### SouvenirVariant
Sellable SKU for a product, with optional variant label/options, SKU, price, currency, stock-tracking flag, and available quantity. A product may have one default variant or multiple variants.

### SouvenirOrder
Guest contact snapshot, unique public reference, order type (STANDARD, CUSTOM, MIXED), status, currency, subtotal/discount/shipping/total snapshots, delivery/pickup choice and address, customer notes, admin notes (never returned publicly), and timestamps.

### SouvenirOrderItem
Optional relation to a catalogue variant plus immutable SKU/name/option/price snapshots, quantity, and line total. Custom-only items can exist without a catalogue variant.

### SouvenirCustomisation
Custom item requirements: requested description, personalization text, artwork/media reference, production notes, and artwork approval state/timestamp. Validate uploaded file type and size server-side; store files in the existing approved media provider rather than raw file bytes in PostgreSQL.

### SouvenirQuote / SouvenirQuoteItem
Quotation for custom or mixed orders, with expiry, status, currency, line-item snapshots, and totals. Production must not start until required quote and artwork approvals are recorded.

### SouvenirOrderStatusHistory
Append-only status transition audit. Stock decrements/restocks must happen transactionally and be idempotent; do not reserve stock merely because an unpriced custom enquiry was submitted.

Suggested lifecycle: SUBMITTED → QUOTED (if needed) → AWAITING_PAYMENT → PAID → IN_PRODUCTION → READY → FULFILLED; plus CANCELLED / REJECTED. Standard priced items can bypass quotation. Custom items require quote acceptance and any required artwork approval.

## Domain C — Appointments

### AppointmentType
Name, slug, description, duration, optional price/currency, active flag, and approval mode (AUTO or ADMIN_REVIEW).

### AppointmentAvailabilityRule
Weekly opening windows by weekday, local start/end time, timezone, and appointment type. The API calculates candidate slots server-side.

### AppointmentAvailabilityException
Date-specific closures or replacement windows for holidays, leave, or special opening hours.

### Appointment
Guest contact snapshot, unique public reference, appointment type, start/end timestamps stored as timezone-aware instants, status, guest notes, admin notes, and timestamps. Statuses: PENDING_APPROVAL, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW, EXPIRED.

- AUTO types can confirm immediately only after the server validates the slot and successfully claims it.
- ADMIN_REVIEW types start as PENDING_APPROVAL; they are not confirmed until an admin approves.
- Slot claims must be concurrency-safe. Use a PostgreSQL exclusion constraint over active appointment time ranges (with btree_gist) for the scheduling resource, or an equivalent locked slot-allocation design. Application-level “check then insert” alone is not sufficient.
- Define the business timezone explicitly (default expected: Africa/Lagos) and store instants in UTC; display/localize using the configured timezone.

### AppointmentStatusHistory
Append-only status transitions, actor, reason, timestamp.

## Shared payment extension

The current Payment.registrationId is required and each payment is tied to a training registration. Extend the existing Payment model with nullable foreign keys for workshopBookingId, souvenirOrderId, and appointmentId; make registrationId nullable, and add the matching Prisma relations. Add a PostgreSQL CHECK constraint requiring exactly one of these four target foreign keys to be non-null. This preserves real foreign keys and avoids a polymorphic entityType/entityId pair with no referential integrity.

The payment service must resolve the target server-side, calculate amount from stored prices/accepted quote, validate currency/amount against Paystack verification, and update payment + target status in one database transaction. Existing registration payment behavior remains unchanged. Payment records and webhook processing must remain idempotent.

## Guest-facing privacy and abuse controls

- Use random, unguessable public references; never expose sequential database IDs.
- No public list endpoints for bookings, orders, or appointments.
- Public lookup (if required) must use a separate high-entropy access token or verified email/phone flow; a reference alone should not disclose personal details.
- Never expose admin notes, provider payloads, payment secrets, or internal moderation/audit details.
- Apply route-level rate limits to public creation and availability endpoints in addition to existing global middleware.
- Validate date ranges, quantities, totals, upload types/sizes, status transitions, and quote expiry in the service layer.

## Migration and rollout plan

1. Add new models/enums and make the existing Payment registration relation nullable without changing current payment endpoint behavior.
2. Add the payment-target CHECK constraint in the generated SQL migration after the new columns/foreign keys exist.
3. Generate Prisma Client and run prisma validate before applying anything.
4. Review the migration SQL; apply to a development/staging database first.
5. Implement modules one at a time, beginning with the souvenir catalogue/order flow.
6. Add integration tests for legacy registration payment, payment idempotency, quote acceptance, stock concurrency, guest privacy, appointment overlap and auto/admin approval.
7. Deploy the schema migration before deploying code that depends on new columns. Do not apply a production migration without a verified backup and staging run.

## Out of scope for the first migration

Customer accounts, loyalty points, complex delivery integrations, automated refunds, multi-currency checkout, and a generic notification/outbox subsystem unless an existing implementation is found and can be reused.
