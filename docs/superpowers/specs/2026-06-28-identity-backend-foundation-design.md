# Identity backend foundation design

Status: approved for implementation planning
Date: 2026-06-28

## Goal

Deliver the smallest secure server-side identity slice for Minerva: connect the existing Nuxt/Nitro application to PostgreSQL through Drizzle, configure Better Auth for email-or-username password authentication, persist sessions, support logout and password recovery through local Mailpit, and provide an idempotent bootstrap command for the first `super_admin`.

This is a focused subset of the broader Identity design in `2026-06-28-user-identity-profile-design.md`. It establishes the database and authentication seams without implementing invitations, profiles, contacts, project roles, two-factor authentication, phone authentication, OAuth, or MCP access.

## Scope boundary

The slice includes:

- the existing PostgreSQL 17 Docker Compose service;
- a local-only Mailpit service for development email delivery;
- validated server-only runtime configuration;
- one Drizzle client, schema set, migration history, and migration workflow;
- Better Auth email/password authentication and the Username plugin;
- database-backed sessions and current-session lookup;
- sign-in by one identifier field containing either email or username;
- logout and session revocation;
- enumeration-safe password recovery and password reset;
- an idempotent, non-HTTP bootstrap command for the first `super_admin`;
- reusable server-side session guards;
- behavior wiring for the existing authentication forms without visual changes.

The slice explicitly excludes public registration, invitations, profile and contact data, account-management UI, project authorization, 2FA, social login, phone login, OAuth Provider, MCP authentication, MinIO, and production email delivery.

## Architecture

Minerva remains one Nuxt/Nitro modular monolith. PostgreSQL is the source of truth for users, credential accounts, sessions, and verification records. Drizzle is the only application database abstraction and the only migration path.

Better Auth uses its Drizzle adapter against the shared PostgreSQL client. Its generated schema is checked into the repository and participates in normal `drizzle-kit` migrations. Application-owned fields extend the Better Auth user schema rather than creating a second authentication identity.

The Identity module owns Better Auth configuration and identity policies. Nitro handlers remain thin adapters: they validate transport input, call Identity services, propagate Better Auth response headers when cookies change, and map internal failures to stable public codes. Reusable server guards obtain the current session from Better Auth and never trust client-side navigation or UI visibility as authorization evidence.

The existing authentication pages retain their current markup and styling. They receive only the state and API wiring required to exercise the server flows.

## Component boundaries

### Runtime configuration

A shared server configuration parser validates `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, trusted origins, and SMTP settings before infrastructure clients are created. Secrets remain server-only. The repository contains documented placeholders in `.env.example`, never real credentials or reset links.

### Database infrastructure

The database infrastructure owns the PostgreSQL connection pool, Drizzle instance, schema exports, migration configuration, and a readiness probe. It exposes database capabilities to modules but contains no authentication rules.

### Identity module

The Identity module owns:

- Better Auth server configuration;
- email/password and Username plugin configuration;
- public sign-up and public username-availability restrictions;
- identifier classification;
- bootstrap orchestration;
- last-successful-login updates;
- account-status checks;
- password-recovery email delivery;
- stable identity error mapping.

Identifier classification treats a syntactically valid email as email and every other supported value as username. Classification happens on the server. Public failures never reveal whether the submitted email or username exists.

### HTTP adapters

The Better Auth catch-all Nitro handler is mounted below `/api/auth/**`. A focused Minerva sign-in adapter accepts `{ identifier, password }`, delegates classification and sign-in to Identity, and returns the Better Auth cookie headers. Password-recovery adapters use the same Identity boundary and stable error contract.

Public HTTP access to Better Auth email sign-up and username-availability operations is blocked. The bootstrap command calls server-side Identity capabilities directly and does not create an administrative HTTP endpoint.

### Mail adapter

Identity depends on a small mail interface rather than Mailpit itself. Development configuration delivers SMTP mail to Mailpit. Production must supply an approved real provider in a later slice. Reset tokens and reset URLs are message content and must never be written to application logs.

### Client integration

The Better Auth Vue client supplies session lookup and logout. Existing sign-in, forgot-password, and reset-password forms call the Minerva adapters, display localized stable errors, disable duplicate submissions, and preserve their current visual structure.

## Data model

All identifiers use UUIDs and all timestamps are stored in UTC.

The first migration creates the Better Auth records required by the approved configuration:

- `user` owns the authentication identity and application account state;
- `account` owns the credential account and password hash;
- `session` owns database-backed sessions;
- `verification` owns password-recovery verification state.
- `rateLimit` owns durable Better Auth and Minerva identity-endpoint counters.

The `user` record includes Better Auth core fields, normalized unique email, normalized unique username and display username, `super_admin`, account status, nullable disable timestamp and administrator-only reason, and nullable `last_login_at`. The first release of this slice supports active accounts; the disabled fields are reserved so the following Identity slice can enforce the already-approved lifecycle without a destructive schema rewrite.

Password hashes exist only in Better Auth credential records. No API, log entry, MCP surface, or profile record exposes them.

## Authentication flows

### Bootstrap

The bootstrap command reads email, username, and password from protected process input. It never accepts a password as a command-line argument and never prints one. It creates the first active user and marks that user as `super_admin` through a private Identity service transaction.

The command is idempotent for the same normalized email and username. If the matching bootstrapped administrator already exists, it succeeds without changing the password. It refuses to elevate a different existing ordinary user and refuses to create a second initial administrator implicitly.

### Sign-in

The client submits one identifier and one password. Identity normalizes and classifies the identifier, invokes the matching Better Auth email or username flow, verifies that the account is active, creates a database session, and updates `last_login_at` only after successful authentication.

Invalid identifiers, unknown accounts, and wrong passwords return the same public `INVALID_CREDENTIALS` result. A disabled account does not receive a session; public sign-in may still use the same generic failure where a distinct status would reveal account existence.

### Session and logout

The browser receives a signed `httpOnly` session cookie. A session expires after seven days and may refresh at most once per day while active. Server handlers resolve it through Better Auth and attach an authenticated actor to request context. Logout revokes the current database session and clears its cookie. A revoked or expired session fails on the next protected request.

### Password recovery

The recovery request accepts an email and always returns `RESET_REQUEST_ACCEPTED`, including for unknown accounts. For an eligible account, Better Auth creates a single-use token that expires after 30 minutes and Mailpit receives the reset link.

Submitting a valid token with a password between 12 and 256 characters replaces the credential hash, consumes the token, and revokes the user's existing sessions. Reuse, expiry, or mutation of the token returns `RESET_TOKEN_INVALID` without internal detail.

## Security controls

- `BETTER_AUTH_SECRET` is at least 32 characters and is never exposed through runtime config available to the browser.
- Session cookies are `httpOnly`, `sameSite=lax`, and `secure` in production.
- Better Auth CSRF protection remains enabled.
- Trusted origins are explicit and environment-specific.
- Public registration and public username availability are unavailable.
- Rate limiting is enabled in development, test, and production and uses PostgreSQL storage rather than process memory.
- Sign-in permits five attempts per 15 minutes for a keyed combination of connecting IP and normalized identifier.
- Recovery request permits three attempts per hour for a keyed combination of connecting IP and normalized email.
- Reset submission permits five attempts per 15 minutes per connecting IP.
- Rate-limit keys use a server-keyed digest instead of storing submitted emails or usernames in plaintext.
- Authentication responses never expose database errors, credential hashes, reset tokens, cookies, SMTP credentials, or connection strings.
- Mailpit binds to loopback interfaces in local development and is not part of production deployment.
- Database unavailability maps to a safe `503` response; detailed diagnostics remain server-side.
- Existing UI state, redirects, and navigation visibility never replace server-side session checks.

## Error contract

The slice uses stable domain codes:

- `INVALID_CREDENTIALS` for enumeration-safe sign-in failure;
- `AUTH_REQUIRED` when a protected operation has no active session;
- `ACCOUNT_DISABLED` for authenticated administrative/configuration contexts that may safely reveal status;
- `RESET_REQUEST_ACCEPTED` for every syntactically valid recovery request;
- `RESET_TOKEN_INVALID` for an invalid, expired, or consumed reset token;
- `SERVICE_UNAVAILABLE` when a required server dependency is unavailable.

The UI localizes these codes. Public responses do not include stack traces or raw Better Auth and PostgreSQL errors.

## Testing strategy

Implementation proceeds in vertical test-first increments.

Unit tests cover environment parsing, identifier classification and normalization, public error mapping, password constraints, and bootstrap input rules.

PostgreSQL integration tests apply migrations to a clean test database and prove unique normalized email and username values, credential separation, database-backed sessions, and bootstrap idempotency and refusal cases.

Authentication integration tests prove that public registration and public username enumeration are blocked; email and username sign-in work; unknown users and wrong passwords produce the same public result; successful sign-in updates `last_login_at`; logout revokes the current session; and protected handlers reject revoked sessions.

Recovery integration tests prove that Mailpit accepts the message without application-log leakage; known and unknown emails receive the same HTTP result; reset tokens expire, are single-use, and cannot be altered; successful reset changes the password and revokes old sessions.

Browser tests exercise the existing sign-in, logout, forgot-password, and reset-password forms without snapshotting or redesigning their appearance. A guest visiting a protected route is redirected to `/auth`, while a valid session reaches the route.

The slice is complete only when a clean database migrates successfully and the dependency install, production build, type check, unit tests, PostgreSQL integration tests, authentication integration tests, and browser tests all pass.

## Delivery workflow

Work proceeds on the isolated `feature/identity-backend-foundation` branch and worktree. Each vertical increment begins with a failing test and ends with focused verification. Completed increments update `docs/progress.md`. Canonical documentation or implementation changes are followed by `./scripts/refresh-tesserae.ps1`; `.tesserae`, secrets, `.env`, mail data, and generated private state remain uncommitted.

## Deferred follow-up

The next Identity slice may build on these seams to add invitation-only activation, optional profiles and contacts, account disabling with the last-active-`super_admin` invariant, project-bound membership creation, 2FA, and a production email provider. Those features are not implied by the endpoints or schema behavior delivered here.
