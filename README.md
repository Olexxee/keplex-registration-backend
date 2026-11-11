# Keplex Registration & Training Backend

Backend API for the **Keplex registration and training platform**.

The application provides the backend infrastructure for user registration, authentication, training programs, course enrollment, payments, testimonials, orders, notifications, addresses, audit logging, and other platform operations.

Built with a modular architecture using **Node.js, Express, Prisma, PostgreSQL, and Zod**.

---

## Overview

The Keplex backend is designed as a production-oriented REST API supporting both public-facing functionality and protected administrative operations.

The system separates HTTP handling, business logic, database access, and request validation into dedicated layers.

### Core architecture

```text
Client
  │
  ▼
Express Application
  │
  ├── Security Middleware
  │   ├── Rate Limiting
  │   ├── CORS
  │   ├── Helmet
  │   └── Request Limits
  │
  ├── Authentication / Authorization
  │
  ├── Request Validation
  │
  ▼
Routes
  │
  ▼
Controllers
  │
  ▼
Services
  │
  ▼
Database Layer
  │
  ▼
Prisma
  │
  ▼
PostgreSQL
```

The backend follows a clear separation of responsibilities:

* **Routes** — define endpoints and middleware.
* **Validation** — validates incoming request data.
* **Controllers** — handle HTTP requests and responses.
* **Services** — contain application/business logic.
* **Database layer** — contains Prisma database operations.
* **Middleware** — handles cross-cutting concerns such as authentication, authorization, validation, rate limiting, and error handling.

---

# Technology Stack

| Technology           | Purpose                                   |
| -------------------- | ----------------------------------------- |
| Node.js              | JavaScript runtime                        |
| Express              | HTTP API framework                        |
| Prisma               | ORM and database access                   |
| PostgreSQL           | Relational database                       |
| Zod                  | Request validation                        |
| JWT / Authentication | User authentication                       |
| CORS                 | Cross-origin request control              |
| Helmet               | HTTP security headers                     |
| express-rate-limit   | API rate limiting                         |
| Multer               | Multipart/file handling                   |
| Paystack             | Payment processing                        |
| Cloudinary           | Media storage                             |
| Redis                | Queue/cache infrastructure where required |

---

# Features

## Authentication

The backend supports authenticated user operations and protected administrative functionality.

Authentication-related functionality includes:

* User registration
* User login
* Authentication state
* Token/session management
* Refresh token handling
* Protected routes
* Role-based authorization
* Admin access control
* Super-admin access control

Protected routes use authentication middleware before reaching application logic.

---

## Role-Based Authorization

Administrative endpoints are protected using authentication and role middleware.

Example:

```text
Request
   │
   ▼
Authentication
   │
   ▼
Role Authorization
   │
   ▼
Controller
```

Supported administrative roles include:

```text
ADMIN
SUPER_ADMIN
```

This allows public, authenticated, administrative, and super-administrative operations to remain separated.

---

# Training Programs

The backend provides management functionality for Keplex training programs.

Supported operations include:

* Creating training programs
* Updating training programs
* Listing training programs
* Retrieving individual programs
* Publishing/activating programs
* Managing featured programs
* Managing program media
* Managing registrations
* Administrative management

Training programs can be managed through protected administrative endpoints.

---

# Registrations

The registration system handles student registration for available training programs.

Registration functionality includes:

* Student registration
* Training program association
* Registration records
* Registration status
* Administrative management
* Historical registration data

Registration records are treated as business records and are not automatically removed when a training program is removed from active use.

---

# Payments

The backend supports payment processing for platform transactions.

Payment functionality is designed around:

* Payment initialization
* Payment verification
* Transaction references
* Payment status tracking
* Payment records
* Payment type identification
* Webhook handling
* Idempotent payment processing

Payment-related operations should always be treated as server-side operations.

The frontend should never be trusted to determine whether a payment was successful.

---

# Testimonials

The platform includes a public testimonial submission and administrative moderation system.

### Public flow

```text
Student
   │
   ▼
Submit testimonial
   │
   ▼
PENDING
   │
   ▼
Admin review
   │
   ├── APPROVED
   │
   └── REJECTED
```

Public users can submit:

* Name
* Role/course
* Rating
* Testimonial message
* Optional image URL

New testimonials are created with:

```text
PENDING
```

Only approved testimonials are exposed through the public testimonial endpoint.

Administrative users can:

* View testimonials
* Search testimonials
* Filter by status
* Approve testimonials
* Reject testimonials
* Return testimonials to pending
* Delete testimonials
* View testimonial statistics

---

# Data Validation

All externally supplied request data should be validated before reaching business logic.

Validation is handled using **Zod**.

Validation can be applied to:

```text
Request Body
Request Query
Request Parameters
```

Example:

```js
router.post(
  "/",
  validateBody(createTestimonialSchema),
  controller.createTestimonial,
);
```

Validated data is made available through:

```js
req.validated
```

For example:

```js
req.validated.body
req.validated.query
req.validated.params
```

This avoids mutating Express's native request properties such as `req.query`.

---

# Architecture

The backend follows a modular structure.

A typical module is organized as:

```text
module/
├── feature.controller.js
├── feature.db.js
├── feature.routes.js
├── feature.service.js
└── feature.validation.js
```

### Controller

Responsible for HTTP concerns.

```text
Request
↓
Controller
↓
Service
↓
Response
```

Controllers should not contain database queries or substantial business logic.

---

## Service Layer

The service layer contains application logic.

Responsibilities include:

* Business rules
* Data normalization
* Workflow logic
* Calling database functions
* Handling business-level errors

Example:

```js
export const createTestimonial = async (data) => {
  const normalizedData = normalizeTestimonialData(data);

  return testimonialDb.createTestimonial({
    ...normalizedData,
    status: "PENDING",
  });
};
```

---

## Database Layer

Database modules contain Prisma operations.

Example:

```js
export const createTestimonial = async (data, tx = prisma) => {
  return tx.testimonial.create({
    data,
  });
};
```

The database layer is intentionally kept focused on database operations.

Business validation and workflow decisions belong in the service layer.

---

# Prisma

Prisma is used as the database access layer.

The Prisma schema lives in:

```text
prisma/schema.prisma
```

Database migrations are stored in:

```text
prisma/migrations/
```

These files are committed to Git because they represent the application's database structure and migration history.

Generated dependencies are not committed.

---

# Database Transactions

Operations that require multiple database changes are handled using Prisma transactions where appropriate.

Example:

```js
await prisma.$transaction(async (tx) => {
  // related database operations
});
```

Database functions support an optional transaction client:

```js
export const updateSomething = async (id, data, tx = prisma) => {
  return tx.something.update({
    where: { id },
    data,
  });
};
```

This allows the same database functions to operate with either:

* the normal Prisma client, or
* an existing transaction client.

---

# Security

Security is treated as a server-level concern rather than something delegated to the frontend.

## Global Rate Limiting

The API uses global rate limiting to restrict excessive requests.

Current configuration:

```text
10 requests / minute / IP
```

The limiter is applied at the Express application level rather than individually to every route.

```text
Client
  ↓
Global Rate Limiter
  ↓
Application
  ↓
Routes
```

This provides a baseline defense against excessive request traffic.

---

## Security Headers

Helmet is used to provide common HTTP security headers.

```js
app.use(helmet());
```

---

## CORS

Cross-origin access is restricted to configured frontend origins.

Production frontend URLs should be supplied through environment variables rather than hardcoded into the application.

---

## Request Size Limits

JSON and URL-encoded request bodies are limited to prevent unnecessarily large payloads from reaching the application.

---

## Authentication and Authorization

Protected resources require authentication.

Administrative resources additionally require an authorized role.

Sensitive credentials and tokens must never be logged or committed to source control.

---

# Error Handling

The application uses centralized error handling.

Controllers use an async wrapper to forward asynchronous errors to Express's error handling pipeline.

Example:

```js
export const controller = asyncWrapper(async (req, res) => {
  // controller logic
});
```

Application-specific errors can be represented using custom error classes.

Production responses should avoid exposing:

* Prisma internals
* Stack traces
* Database details
* Secrets
* Internal implementation details

---

# Logging

Production logging is handled through application output rather than relying on local log files.

The application can write structured information to:

```text
stdout
stderr
```

When deployed on Render, these logs are collected by Render and made available through the service's log interface.

Typical production events worth logging include:

* Server startup
* Database failures
* Authentication failures
* Important administrative actions
* Payment failures
* External API failures
* Unexpected application errors

Sensitive information should never be logged.

Do not log:

```text
Passwords
Access tokens
Refresh tokens
Authorization headers
API keys
Payment secrets
Sensitive request payloads
```

---

# Environment Variables

Production secrets should never be committed to Git.

Example environment variables:

```env
NODE_ENV=development
PORT=3000

DATABASE_URL=

FRONTEND_URL=

JWT_SECRET=
JWT_REFRESH_SECRET=

PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

REDIS_URL=
```

The exact environment variables required by the application depend on the enabled modules and integrations.

For local development, create:

```text
.env
```

For production, configure environment variables directly in the hosting platform.

---

# Installation

## Requirements

Before running the backend locally, install:

* Node.js
* npm
* PostgreSQL

Verify Node:

```bash
node --version
```

Verify npm:

```bash
npm --version
```

---

# Clone the Repository

```bash
git clone <repository-url>
cd <repository-directory>
```

Install dependencies:

```bash
npm install
```

---

# Environment Configuration

Create a local `.env` file:

```env
NODE_ENV=development
PORT=3000

DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"

FRONTEND_URL="http://localhost:5173"
```

Add the remaining integration credentials required by the application.

Never commit `.env`.

---

# Prisma Setup

Generate the Prisma client:

```bash
npx prisma generate
```

For development migrations:

```bash
npx prisma migrate dev
```

To inspect the database:

```bash
npx prisma studio
```

For production deployments, migrations should be applied using:

```bash
npx prisma migrate deploy
```

Do not use `prisma migrate dev` against the production database.

---

# Running the Application

Development:

```bash
npm run dev
```

Production:

```bash
npm start
```

The exact scripts are defined in `package.json`.

---

# API Structure

The API is exposed under:

```text
/api
```

Example resources include:

```text
/api/auth
/api/training
/api/registration
/api/testimonial
/api/payment
/api/users
```

The exact available endpoints can be inspected in the corresponding route modules.

---

# Health Check

The application should expose a lightweight health endpoint for deployment and infrastructure checks.

Example:

```text
GET /health
```

A healthy response should confirm that the application process is running.

Database checks can be added where appropriate if the health endpoint needs to represent database availability as well.

---

# Production Deployment

The backend is designed to be deployable to **Render**.

A typical deployment architecture is:

```text
                    ┌───────────────┐
                    │    Client     │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │    Vercel     │
                    │   Frontend    │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │    Render     │
                    │    Backend    │
                    └───────┬───────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
        ┌───────────────┐       ┌───────────────┐
        │  PostgreSQL   │       │ External APIs │
        │   Database    │       │ Paystack/etc. │
        └───────────────┘       └───────────────┘
```

---

# Render Configuration

Configure the production environment variables in the Render dashboard.

Do not place production secrets inside the repository.

Typical settings:

```text
Build Command:

npm install && npx prisma generate
```

```text
Start Command:

npm start
```

If migrations need to be applied during deployment, the deployment command can include:

```bash
npx prisma migrate deploy
```

The exact Render configuration should match the scripts defined in `package.json`.

---

# Production Checklist

Before deploying:

* [ ] Production `DATABASE_URL` configured
* [ ] Production frontend URL configured
* [ ] JWT secrets configured
* [ ] Payment credentials configured
* [ ] Cloudinary credentials configured
* [ ] Redis credentials configured if required
* [ ] `.env` excluded from Git
* [ ] Prisma schema committed
* [ ] Prisma migrations committed
* [ ] `prisma migrate deploy` tested
* [ ] CORS restricted to production frontend
* [ ] Global rate limiting enabled
* [ ] Helmet enabled
* [ ] Request body limits configured
* [ ] Authentication tested
* [ ] Admin authorization tested
* [ ] Production error responses checked
* [ ] Sensitive information removed from logs
* [ ] Health endpoint available
* [ ] Database backup strategy confirmed
* [ ] Payment webhook verification tested
* [ ] Payment idempotency tested

---

# Git and Secrets

The repository should contain the source code required to build and deploy the application.

It should **not** contain:

```text
.env
.env.production
API keys
Database passwords
JWT secrets
Payment secrets
Cloudinary secrets
Private credentials
```

The following should be committed:

```text
prisma/schema.prisma
prisma/migrations/
src/
package.json
package-lock.json
prisma.config.ts
```

An `.env.example` file can be committed to document the required environment variables without containing real credentials.

---

# Project Structure

A simplified project structure:

```text
src/
├── classes/
│   └── errorClasses.js
│
├── config/
│   ├── prisma.js
│   └── ...
│
├── lib/
│   ├── asyncWrapper.js
│   └── ...
│
├── middlewares/
│   ├── authMiddleware.js
│   ├── roleMiddleware.js
│   ├── validateMiddleware.js
│   ├── rateLimitMiddleware.js
│   └── ...
│
├── modules/
│   ├── auth/
│   ├── training/
│   ├── registration/
│   ├── testimonial/
│   ├── payment/
│   ├── user/
│   ├── address/
│   ├── notification/
│   ├── audit/
│   └── ...
│
├── app.js
└── server.js
│
prisma/
├── schema.prisma
└── migrations/
│
.env
.env.example
package.json
package-lock.json
README.md
```

The actual module list may evolve as the platform grows.

---

# Development Principles

The backend follows several architectural principles.

### Keep controllers thin

Controllers should primarily:

1. Read validated request data.
2. Call the service.
3. Return the HTTP response.

### Keep business logic in services

Business rules should not be duplicated across controllers and database functions.

### Keep database functions focused

Database modules should primarily contain Prisma queries.

### Validate at the boundary

Incoming request data should be validated before entering application logic.

### Use transactions for related writes

Operations that must succeed or fail together should use database transactions.

### Protect sensitive operations

Authentication and authorization should be enforced server-side.

### Preserve business records

Important historical records such as registrations and payments should not be casually destroyed simply because a related entity is no longer active.

---

# API Design Philosophy

The API is designed around predictable REST-style resources.

Examples:

```text
GET     /api/testimonial
POST    /api/testimonial

GET     /api/testimonial/admin
GET     /api/testimonial/admin/stats
PATCH   /api/testimonial/admin/:id/status
DELETE  /api/testimonial/admin/:id
```

Administrative endpoints are explicitly separated from public endpoints where appropriate.

---

# Future Improvements

The backend is intentionally being hardened incrementally rather than introducing unnecessary infrastructure before it is required.

Potential future improvements include:

* More granular rate limits for sensitive endpoints
* Background job processing
* Advanced caching
* External log aggregation
* Error monitoring
* Application performance monitoring
* Automated database backup verification
* More extensive audit trails
* Advanced observability
* Additional API documentation
* Automated integration and end-to-end testing

These should be introduced according to actual application requirements and production traffic rather than prematurely adding infrastructure.

---

# License

This project is proprietary software developed for Keplex.

Unauthorized copying, distribution, modification, or commercial use is not permitted without permission from the project owner.

---

# Status

**Production Development**

The backend is actively developed and hardened for production deployment.

Built for **Keplex**.


## Site content, gallery, and learning resources

Apply the new database migration with the existing deployment step (`npm run prisma:migrate`) and regenerate Prisma Client (`npm run prisma:generate`) before starting the updated API.

Public content endpoints are mounted under `/api/site-content`:
- `GET /hero` — active published homepage hero.
- `GET /gallery/categories` and `GET /gallery?category=<slug>` — published gallery categories and images.
- `GET /resources?search=<term>` and `GET /resources/:slug` — published PDF resource catalogue and resource detail.
- `GET /resources/:slug/download` — attachment download for a published PDF.

All routes under `/admin` require the existing admin access token and the `ADMIN` or `SUPER_ADMIN` role. Upload endpoints are `POST /admin/uploads/hero-image`, `POST /admin/uploads/gallery-image`, and `POST /admin/uploads/resource-pdf`; each accepts multipart field `file`. Images are limited to 15 MB and PDFs to 50 MB. PDF uploads use Cloudinary's `image` resource type for browser reading and are checked for a PDF signature. Cloudinary may block PDF delivery by default on Free environments; enable PDF delivery in the product environment's Security settings before publishing manuals.

Create hero drafts and publish them explicitly. Publishing archives the previous live version, so drafting or editing a draft does not change the public homepage. Gallery images and resources also remain private to the admin API until published. Resource PDFs are served from Cloudinary; the public site provides an online reader and a direct download link.

## Souvenir pricing and upload reliability

Souvenir quantity tiers now define a **per-piece unit price**. The backend calculates `quantity × unitPrice` in integer minor units, stores the unit-rate and total-price snapshots, and Paystack charges only the persisted order total. Admins must configure and activate unit rates for legacy tiers after the migration; old fixed-tier totals are deliberately not guessed or converted.

See [the souvenir pricing and upload rollout guide](docs/souvenir-pricing-and-upload-rollout.md) for the migration procedure, colour-selection rules, tests, and the limits of the Render upload mitigation. Run `npm test` to execute the souvenir pricing unit tests.

---

# Paid Training Onboarding Email

After a training payment is verified successfully, the backend marks the registration as paid and queues a programme-specific Telegram access email. Frontend payment verification and the signed Paystack `charge.success` webhook use the same payment verification service.

## Admin configuration

Each training programme has a `telegramGroupUrl` field managed through the existing protected endpoints:

- `POST /api/training/admin`
- `PATCH /api/training/admin/:id`

Use an HTTPS Telegram invite/group URL hosted on `t.me` or `telegram.me`. A programme must have this link configured before a new payment can be initialized.

The link is omitted from public training-programme list and detail responses. Admin programme responses retain the field.

## Payment and email flow

```text
Payment verification OR signed Paystack webhook
                      |
                      v
             Verify with Paystack
                      |
                      v
            Single Prisma transaction
              |         |         |
              v         v         v
           Payment  Registration  EmailOutbox
           SUCCESS     PAID        PENDING
                                    |
                                    v
                          Embedded server worker
                                    |
                                    v
                                  Resend
                             SENT / retry / DEAD
```

Payment, registration and outbox insertion commit atomically. Email delivery is asynchronous; a Resend outage does not reverse a confirmed payment or block the payment API response.

The outbox uses a unique `dedupeKey`, PostgreSQL `FOR UPDATE SKIP LOCKED` row claiming, a five-minute processing lease, exponential retry backoff, and a terminal `DEAD` state after the configured maximum attempts. Resend requests use a stable idempotency key derived from the outbox ID. This reduces duplicate sends but cannot promise exactly-once delivery across every provider/network failure.

The worker runs inside the existing `server.js` process. It starts after the database connects and stops before Prisma disconnects. No separate Render worker service is needed. If Resend credentials or a sender are missing, pending jobs remain in PostgreSQL and the worker stays disabled.

## Email configuration

Configure these Render environment variables:

```env
RESEND_API_KEY=
TRANSACTIONAL_FROM_EMAIL="KPX Academy <admissions@kpxacademy.com.ng>"
SUPPORT_REPLY_TO_EMAIL=support@kpxacademy.com.ng
EMAIL_OUTBOX_POLL_INTERVAL_MS=5000
EMAIL_OUTBOX_MAX_ATTEMPTS=8
```

The sender address/domain must be verified in Resend. A WhoGoHost forwarding alias alone does not authorize sending through Resend. The existing `CERTIFICATE_FROM_EMAIL` remains a fallback sender for compatibility.

## Migration and deployment

The migration is located at:

`prisma/migrations/20261105120000_training_telegram_email_outbox/migration.sql`

Deploy it with:

```bash
npx prisma migrate deploy
npx prisma generate
```

Do not use `prisma migrate dev` against production.

## Operational notes

- Monitor Render logs for `[EmailOutbox]` messages.
- Jobs in `DEAD` require investigation before manual re-queue.
- The payment stores a snapshot of the student's name, email, programme title and Telegram URL when checkout is initialized. That snapshot is copied into the outbox when payment is confirmed, so later programme edits do not alter in-flight checkout email content.
- Do not remove a programme's Telegram link while checkouts are in progress.
- Certificate rendering now composes the branded SVG, official Site Branding logo, dynamic certificate details and QR code on the backend, then stores a 300-DPI A4 landscape PDF in Cloudinary. Resends reuse the exact stored PDF. See [certificate management](docs/certificate-management.md), [design specification](docs/certificate-design-specification.md), and [decorative artwork](assets/certificates/kpx-certificate-artwork.svg). The PDF is currently a raster page with system font fallbacks; font embedding and final visual validation remain outstanding. CERT-01 defines the A4 landscape composition and decorative SVG artwork; see [the certificate design specification](docs/certificate-design-specification.md) and [decorative artwork](assets/certificates/kpx-certificate-artwork.svg). Dynamic certificate content, PDF rendering, QR generation and delivery remain backend responsibilities.



## Organization profile and public footer

Organization identity and public contact details are managed separately from the transactional email sender and from the Site Branding logo. The single-record `OrganizationProfile` model is the source of truth for the public footer. The logo continues to be managed by the existing Site Branding feature.

### Public endpoint

`GET /api/site-content/organization`

Returns the public organization profile: organization name, tagline, description, contact email, phone, WhatsApp number, address, operating hours, social profile URLs, and copyright text. The endpoint is intentionally public and must not include private credentials or transactional sender configuration.

### Admin endpoint

`PATCH /api/site-content/admin/organization`

Requires the existing admin access token and `ADMIN` or `SUPER_ADMIN` role. Accepts a partial JSON object containing only the organization profile fields. Email and URL fields are validated by the API. The profile is stored as a singleton record with ID `organization-profile`.

### Important separation

- `contactEmail` is the public-facing contact address shown on the website.
- `TRANSACTIONAL_FROM_EMAIL` and `CERTIFICATE_FROM_EMAIL` remain server environment configuration and must not be changed by editing organization information.
- The public logo remains in `SiteBranding`; this profile does not replace the existing logo-management flow.
- Footer navigation links remain application routes, not administrator-supplied arbitrary URLs.

### Migration

The schema migration is:

`prisma/migrations/20261111000000_add_organization_profile/migration.sql`

Apply it during deployment with `npm run prisma:migrate` (or `npx prisma migrate deploy`) and regenerate Prisma Client with `npm run prisma:generate`. The API returns safe defaults when the singleton has not yet been saved, so deploying the migration does not require a manual seed step. Admins can populate the details under **Admin → Organization info**.


# Frequently Asked Questions (FAQ)

FAQs are managed from the authenticated admin workspace and are served publicly only when their status is `PUBLISHED`.

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/site-content/faq` | Public | List published FAQs ordered by display order |
| GET | `/api/site-content/admin/faq` | Admin / Super Admin | List all FAQs, including drafts and archived entries |
| POST | `/api/site-content/admin/faq` | Admin / Super Admin | Create an FAQ draft |
| PATCH | `/api/site-content/admin/faq/:id` | Admin / Super Admin | Edit an FAQ or change its publication status |
| DELETE | `/api/site-content/admin/faq/:id` | Admin / Super Admin | Delete an FAQ |

Each FAQ has a question, answer, status (`DRAFT`, `PUBLISHED`, or `ARCHIVED`), and display order. New entries default to `DRAFT`. Publishing sets `publishedAt`; moving an entry out of `PUBLISHED` clears it. The public endpoint never returns drafts or archived entries.

Production deployments must apply the committed Prisma migration with `npx prisma migrate deploy`.


### Workshop booking status lifecycle

Admin booking updates enforce the following state machine:

- `NEW` → `UNDER_REVIEW` or `CANCELLED`
- `UNDER_REVIEW` → `PROPOSAL_SENT`, `ACCEPTED`, or `CANCELLED`
- `PROPOSAL_SENT` → `ACCEPTED` or `CANCELLED`
- `ACCEPTED` → `CONFIRMED` or `CANCELLED`
- `CONFIRMED` → `IN_PROGRESS` or `CANCELLED`
- `IN_PROGRESS` → `COMPLETED`
- `COMPLETED` and `CANCELLED` are terminal states.

Status transitions use a conditional database update against the previously read status. If another admin changes the booking concurrently, the second update receives a conflict response and must refresh. Admin-note-only updates remain available in every state. Empty and unknown-field update payloads are rejected.

Run `npm test` to execute the workshop lifecycle tests.


## Workshop booking history and customer notifications

Every workshop booking receives an immutable creation-history entry. Admin status changes and date changes write an audit entry in the same database transaction as the booking update. Each entry records the previous and new status/date, the authenticated admin ID where applicable, an optional customer-facing message, and the timestamp. Guest status access returns a safe history projection; it never exposes admin notes or internal admin identifiers.

The admin update endpoint accepts:
- `status` — subject to the existing booking state machine.
- `eventDate` — a future date/time for rescheduling.
- `customerMessage` — optional text shared with the customer and included in the relevant email.
- `adminNotes` — private internal notes; never exposed on the guest page.

Customer emails are queued for proposal sent, confirmed, cancelled, and rescheduled events. The outbox insertion and audit write share the booking transaction. The existing embedded Render worker sends these emails through Resend with a stable provider idempotency key and retries failed deliveries. Email failure does not roll back the booking update. The email refers customers to the private status link originally issued at booking creation; it does not reproduce or store the raw access token.

### Migration

Apply the two migrations `20261111145900_add_workshop_booking_notification_type` and `20261111150000_workshop_booking_history_notifications` with:

```bash
npx prisma migrate deploy
npx prisma generate
```

The migration generalizes the existing email outbox by adding a deduplication key and an optional workshop booking association while preserving existing training-email rows. Existing outbox records receive deterministic deduplication keys. Do not apply this migration manually with ad hoc SQL.
