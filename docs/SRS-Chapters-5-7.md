# Software Requirements Specification (SRS) — Chapters 5–7

**System:** University Hall Booking Web Application (“Find Your Spot”)  
**Document:** Excerpt — Chapters 5 through 7  
**Date:** April 2026  

---

## 5. System Design and Architecture

### 5.1 Architectural Overview

The system follows a **three-tier architecture** implemented as a single deployable web application:

1. **Presentation layer:** React 18 user interface rendered by the Next.js 14 App Router, styled with Tailwind CSS. Navigation and role-specific layouts separate customer, administrator, and unauthenticated (viewer) experiences.
2. **Application layer:** Next.js Route Handlers under `src/app/api/**` implement REST-style endpoints. Controllers encapsulate business rules (authentication, booking validation, admin operations). Middleware enforces route protection based on JWT session claims.
3. **Data layer:** Prisma ORM maps domain entities to a relational database. The reference implementation uses **SQLite** via `DATABASE_URL` for development; production deployments should use a **managed server database** (see Chapter 7) when hosting on platforms without a persistent writable filesystem.

### 5.2 Major Software Components

| Component | Responsibility |
|-----------|----------------|
| **Authentication module** | Registration, login, viewer session, JWT issuance and verification (`jose`), password hashing (`bcryptjs`), HTTP-only session cookie. |
| **Hall management** | CRUD for halls, optional multiple images (`HallImage`), filters (capacity, amenities, price), optional “extras” text. |
| **Booking module** | Create, list, and approve/reject bookings; weekly schedule views for customer and admin; conflict detection by hall, date, and hour range. |
| **Review module** | Submit reviews; moderation workflow (pending/approved/rejected) for administrators. |
| **User profile** | Customers and admins update name, email, and profile photo (URL or uploaded data URL). |
| **Administration** | User list (excluding current admin), role changes only, safe deletion rules for super-admin accounts. |

### 5.3 Data Model (Conceptual)

Core entities and relationships:

- **User** — one-to-many **Booking** and **Review**.
- **Hall** — one-to-many **Booking**, **Review**, and **HallImage**.
- **Booking** — links **User** and **Hall** with date, start/end hours, status, optional rejection reason.
- **Review** — links **User** and **Hall** with rating, comment, status, optional rejection reason.

Schema evolution is managed with **Prisma Migrate**; the application must not assume columns exist without a successful migration on the target database.

### 5.4 Session and Security Design

- Sessions are represented by signed JWTs stored in an HTTP-only cookie to reduce XSS exposure to session theft.
- Role-based access is enforced in middleware for page routes and in controllers/API handlers for mutations.
- Passwords are never stored in plaintext; only password hashes are persisted.

### 5.5 Deployment Unit

The deployable artifact is the built Next.js application (`next build` / `next start`) together with environment configuration and a migrated database. Static assets and server-rendered pages are served by the Node.js process hosting Next.js.

---

## 6. External Interface Requirements

### 6.1 User Interface

#### 6.1.1 General

- The interface shall be **responsive** and usable on common desktop and mobile browsers (current versions of Chrome, Edge, Firefox, Safari).
- The interface shall provide **clear navigation** for: home/login, hall browsing, bookings, profile (authenticated customers), and admin areas (authenticated administrators).
- **Profile photos** shall display next to the user name in navigation when available.
- **Hall listing** shall show primary imagery, key attributes (capacity, amenities, price where applicable), and a short indication of optional “extra features” when configured.
- **Hall detail** shall support **multiple photos** with carousel navigation (arrows and touch swipe) when more than one image exists.

#### 6.1.2 Customer

- Customers shall browse and filter halls, view details, request bookings, view their bookings (including weekly table views), and manage profile information.
- Booking actions shall respect business rules (e.g., no overlapping bookings for the same hall and time window).

#### 6.1.3 Administrator

- Administrators shall manage halls (including multiple photos and optional extras text), approve or reject bookings and reviews, view schedules in tabular form, and manage user roles and deletions subject to safety rules for super-admin accounts.

#### 6.1.4 Viewer (Unauthenticated Limited Access)

- Viewers shall browse hall information and availability-related views where implemented, without performing bookings that require a full customer account, per product policy.

### 6.2 Software Interfaces

#### 6.2.1 HTTP API (Representative)

The system exposes JSON HTTP APIs under `/api/...`, including (non-exhaustive):

| Area | Examples |
|------|----------|
| Auth | Registration, login, logout, profile update, viewer login |
| Halls | List (with filters), create/update/delete (admin) |
| Bookings | Customer and admin booking operations |
| Reviews | Submit and moderate reviews |
| Admin | User listing and role updates |

**Requirements:**

- Successful responses shall use **JSON** bodies with predictable shapes for clients.
- Error responses shall use appropriate HTTP status codes and JSON payloads so clients are not required to parse HTML error pages.
- Authenticated requests shall rely on the session cookie unless documented otherwise.

#### 6.2.2 Database Interface

- The application accesses the database **only through Prisma Client** generated from `schema.prisma`.
- Connection configuration shall be supplied via **`DATABASE_URL`** (and optional Prisma-specific variables if used).

### 6.3 Hardware Interfaces

- No specialized hardware is required. Standard end-user devices (PC, tablet, smartphone) with network access suffice.
- Optional: HTTPS termination may be handled by a reverse proxy or platform load balancer in production.

### 6.4 Communication Interfaces

- **Protocol:** HTTPS recommended for production (TLS 1.2+).
- **Email/SMS:** Not mandated by this excerpt; password reset or notifications may be added in future revisions.

---

## 7. Non-Functional Requirements

### 7.1 Performance

- Page interactions (navigation, filtering, form submission) shall complete within acceptable interactive latency on a typical broadband connection under normal load (exact SLAs may be defined by the deployment environment).
- Database queries for list and detail pages shall use indexed fields where defined in the schema to avoid full-table scans on large datasets.

### 7.2 Security

- User passwords shall be stored using a strong one-way hash.
- Session tokens shall be integrity-protected (signed JWTs).
- **Role separation:** administrative functions shall not be available to customer-only accounts.
- **Input validation:** server-side validation shall apply to all mutations (booking times, roles, hall attributes).
- **SQL injection:** mitigated by parameterized queries via Prisma.

### 7.3 Reliability and Maintainability

- Database schema changes shall be applied through **Prisma migrations** to keep environments consistent.
- Application errors on API routes shall not expose stack traces or internal paths to end users in production builds.

### 7.4 Portability

- The system shall run on **Node.js** LTS versions supported by Next.js 14.
- Development uses SQLite; **production hosting on ephemeral/serverless filesystems requires a network database** (e.g., PostgreSQL) and updating `DATABASE_URL` and Prisma datasource configuration accordingly.

### 7.5 Usability and Accessibility

- UI text shall be legible; form controls shall have visible labels.
- Further WCAG conformance may be specified in a future revision.

### 7.6 Deployment and Hosting Constraints

- **Build:** `npm run build` (includes `prisma generate` per project scripts) produces an optimized production build.
- **Runtime:** `npm run start` runs the production server.
- **Environment variables:** At minimum, `DATABASE_URL` and a strong `JWT_SECRET` (or equivalent secret used by the auth implementation) must be set in production.
- **SQLite limitation:** File-based SQLite is suitable for single-server or local development. **Serverless platforms** (e.g., Vercel) typically require a hosted SQL database because the local filesystem is not a durable database store.
- **Migrations:** After deployment or before first production traffic, run `npx prisma migrate deploy` against the production database (often as a CI step or one-off release command).

---

*End of Chapters 5–7.*
