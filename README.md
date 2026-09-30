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
