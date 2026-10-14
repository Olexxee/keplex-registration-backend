# KPX Academy Service and Endpoint Orchestration

Design only. No runtime routes, Prisma schema, database, or migrations are changed by this document.

## Conventions

- API base: /api. Responses follow the existing { success, message?, data } envelope.
- Route middleware validates body, query and params with Zod; controllers read req.validated and only handle HTTP; services own business rules and transactions; DB modules contain Prisma queries only and accept tx = prisma.
- Admin endpoints use authMiddleware and roleMiddleware("ADMIN", "SUPER_ADMIN").
- Public endpoints expose active catalogue data only. Never expose public lists of private bookings/orders/appointments.
- Use random public references plus a separate high-entropy access token or verified guest flow for guest access. A reference alone must not reveal personal details.
- Client-supplied prices/totals are never authoritative.

## Module layout

src/modules/workshops/{workshop.routes.js, workshop.controller.js, workshop.service.js, workshop.db.js, workshop.validation.js}
src/modules/souvenirs/{souvenir.routes.js, souvenir.controller.js, souvenir.service.js, souvenir.db.js, souvenir.validation.js}
src/modules/appointments/{appointment.routes.js, appointment.controller.js, appointment.service.js, appointment.db.js, appointment.validation.js}

Keep shared auth, payment, media/upload, validation, error handling, and notification infrastructure in their existing modules. Each domain owns its workflow and status transitions.

## 1. Workshops

Public base: /api/workshops

| Method | Path | Purpose |
|---|---|---|
| GET | / | List active workshop types |
| GET | /:slug | Get active workshop detail |
| POST | /bookings | Submit guest request with one or more activities |
| GET | /bookings/access/:token | Optional safe guest booking summary |
| POST | /bookings/:reference/quote-response | Accept/reject quote only after guest authorization |

Admin base: /api/workshops/admin

| Method | Path | Purpose |
|---|---|---|
| GET | /bookings | Filtered, paginated booking list |
| GET | /bookings/:id | Booking, quote and status history |
| PATCH | /bookings/:id/status | Validated transition with reason |
| POST | /bookings/:id/quotes | Create versioned itemized quote with expiry |
| PATCH | /bookings/:id/quotes/:quoteId | Edit quote while editable |
| POST | /bookings/:id/quotes/:quoteId/send | Mark sent and notify guest |
| POST | /types | Create workshop type |
| PATCH | /types/:id | Update type |
| PATCH | /types/:id/status | Activate/deactivate type |

Booking input: contact name/email/phone, activity IDs and participant counts, preferred date/time window, venue mode (client venue, KPX venue, or to be arranged), venue details, and notes. Server ignores client prices. A request starts REQUESTED, not CONFIRMED. Quote acceptance does not automatically confirm event logistics or mark it paid. Status history is written in the same transaction as each transition.

## 2. Souvenirs

Public base: /api/souvenirs

| Method | Path | Purpose |
|---|---|---|
| GET | /categories | Active categories |
| GET | / | Active products with filters/pagination |
| GET | /:slug | Product, variants and availability |
| POST | /orders | Submit standard, custom, or mixed order |
| GET | /orders/access/:token | Optional safe guest order summary |
| POST | /orders/:reference/quote-response | Accept/reject custom quote after guest authorization |

Admin base: /api/souvenirs/admin

| Method | Path | Purpose |
|---|---|---|
| GET | /orders | Filtered, paginated orders |
| GET | /orders/:id | Order and quote details |
| PATCH | /orders/:id/status | Validated transition |
| POST | /orders/:id/quotes | Create itemized quote with expiry |
| POST | /orders/:id/quotes/:quoteId/send | Send quote |
| PATCH | /orders/:id/customisations/:customisationId/artwork | Approve/reject artwork with reason |
| POST | /categories | Create category |
| PATCH | /categories/:id | Update category |
| POST | /products | Create product and variants |
| PATCH | /products/:id | Update product |
| PATCH | /products/:id/status | Activate/deactivate |
| POST | /products/:id/variants | Add variant/SKU |
| PATCH | /variants/:id | Update variant/stock configuration |

Order input includes guest contact, delivery/pickup choice, address where relevant, variant IDs and quantities, and customisation/artwork details. Server computes prices, discounts, shipping and totals. Standard orders can proceed to payment at the server-calculated total. Custom/mixed orders requiring a quote remain pending until the quote is accepted. Stock changes must be transactional and idempotent; do not hold stock indefinitely for an unpriced enquiry. Production requires payment and any required artwork approval.

## 3. Appointments

Public base: /api/appointments

| Method | Path | Purpose |
|---|---|---|
| GET | /types | Active appointment types |
| GET | /types/:slug | Type detail |
| GET | /availability | Available slots for type and date range |
| POST | / | Request/book a slot |
| GET | /access/:token | Optional safe guest appointment summary |
| POST | /:reference/cancel | Guest cancellation with access authorization and policy check |

Availability query: appointmentType, from, to, timezone. Bound the requested date range. Interpret working hours in the configured business timezone (expected default Africa/Lagos) and store appointment instants in UTC.

Admin base: /api/appointments/admin

| Method | Path | Purpose |
|---|---|---|
| GET | / | Filtered, paginated appointments |
| GET | /:id | Details and status history |
| POST | /:id/approve | Approve pending request and recheck availability atomically |
| POST | /:id/reject | Reject with reason |
| POST | /:id/cancel | Admin cancellation with reason |
| POST | /:id/complete | Mark completed |
| POST | /:id/no-show | Mark no-show |
| POST | /types | Create type |
| PATCH | /types/:id | Update type |
| PATCH | /types/:id/status | Activate/deactivate |
| PUT | /types/:id/availability-rules | Replace weekly opening rules |
| POST | /availability-exceptions | Add closure/special hours |
| PATCH | /availability-exceptions/:id | Edit exception |
| DELETE | /availability-exceptions/:id | Remove exception |

Each type has approval mode AUTO or ADMIN_REVIEW. AUTO may confirm only after a concurrency-safe slot claim succeeds. ADMIN_REVIEW creates PENDING_APPROVAL; approval must recheck overlap. If pending requests temporarily hold slots, the hold must expire automatically. An application-only check-then-insert is not sufficient to prevent double bookings.

## 4. Payments

Keep existing training endpoints and behavior:
- POST /api/payments/initialize
- GET /api/payments/verify/:reference
- POST /api/payments/webhook

Add explicit endpoints to avoid client-selected generic target types:
- POST /api/payments/workshops/initialize
- POST /api/payments/souvenirs/initialize
- POST /api/payments/appointments/initialize

Each payment service loads the target and computes amount from stored prices or the current accepted quote. Extend Payment with nullable foreign keys to each target and a database CHECK constraint requiring exactly one payment target. Do not use an unconstrained polymorphic entityType/entityId pair. Public responses must never include providerPayload. Paystack verification remains server-side and idempotent.

Payment success transitions:
- Workshop: mark paid and update booking only as allowed by quote and operational confirmation state.
- Souvenir: mark paid and perform stock handling transactionally.
- Appointment: mark paid, but retain approval/slot rules; payment alone must not override ADMIN_REVIEW.
- Failed or abandoned payment never marks the target paid.

## 5. State and error contract

- Workshop: REQUESTED → QUOTED → AWAITING_PAYMENT/CONFIRMED → COMPLETED; also DECLINED, CANCELLED, EXPIRED.
- Souvenir: SUBMITTED → QUOTED if needed → AWAITING_PAYMENT → PAID → IN_PRODUCTION → READY → FULFILLED; also REJECTED/CANCELLED.
- Appointment: PENDING_APPROVAL or CONFIRMED → CANCELLED/COMPLETED/NO_SHOW/EXPIRED, subject to transition rules.

Use 400 for validation errors (existing middleware), 404 for missing records, and 409 for invalid state transitions, unavailable stock, or conflicting appointment slots. Never return admin notes or internal payment payloads in public responses. Apply route-specific rate limits to public writes and availability checks.

## 6. Implementation order

1. Confirm this contract.
2. Implement souvenir catalogue and standard priced orders.
3. Add custom order quotations and artwork approval.
4. Implement workshop catalogue, multi-activity requests, and quotations.
5. Implement appointment types, availability rules/exceptions, and conflict-safe slot claiming.
6. Extend Paystack association/webhook handling without breaking training payments.
7. Add admin integration tests, guest privacy tests, quote/payment idempotency tests, stock concurrency tests, and appointment overlap tests.
8. Run Prisma validation and review generated migration locally; the repository owner applies migrations.

No customer accounts, public transaction lists, frontend-driven totals, auto-confirmed workshops without operational checks, or generic polymorphic payment targets in this iteration.
