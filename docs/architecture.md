# Minerva architecture

Status: proposed  
Last updated: 2026-06-24

## Architectural style

Minerva is a modular monolith deployed as one Nuxt/Nitro application with PostgreSQL and S3-compatible object storage. Web pages, Nitro API handlers, background jobs, and MCP transport adapters call the same application services. Transport code never owns business rules.

This keeps the first release operable on one VPS while preserving boundaries that can later be separated if load or security demands it.

## Module boundaries

### Identity

Owns Better Auth configuration, sessions, invitations, TOTP, account status, global `super_admin`, and OAuth 2.1 provider behavior.

### Authorization

Owns permission definitions, project roles, role-permission assignments, memberships, last-admin invariants, and permission evaluation.

### Projects

Owns project lifecycle and project metadata. It depends on Authorization for access decisions and Audit for event recording.

### Documents

Owns document trees, draft concurrency, Tiptap validation, publication, immutable versions, restore behavior, links, backlinks, and templates.

### Search

Owns document text extraction, PostgreSQL search vectors, ranking, filters, and authorization-aware result queries.

### Files

Owns image metadata, validation, S3 object keys, upload completion, authorized reads, and lifecycle cleanup. Raw object-store credentials never leave the server.

### Audit

Owns append-only security and business events. Events include actor, channel (`web`, `api`, `mcp`, `system`), client identity, target, request ID, outcome, and structured metadata.

### MCP

Owns Streamable HTTP framing, capability/resource/tool registration, OAuth token validation, scope enforcement, schema validation, idempotency, and translation to shared application-service calls.

## Request flow

1. A web, API, or MCP adapter authenticates the caller.
2. It builds an actor context containing user ID, global flags, project membership, OAuth client, scopes, locale, and request ID.
3. An application service validates input and asks Authorization for a permission decision.
4. The service executes one transaction and appends its audit event.
5. The adapter maps domain results to localized UI messages or stable machine error codes.

## Data rules

- Use UUID primary keys.
- Use UTC timestamps in storage and locale-aware rendering at the edge.
- Use soft deletion for projects, documents, and images in the first release.
- Store Tiptap JSON as `jsonb`; store search text and `tsvector` separately.
- Number published document versions monotonically per document inside a transaction.
- Store internal links as stable source/target IDs with link type and version/draft origin.
- Use a numeric draft revision for optimistic concurrency.

## Error contract

Application services return stable domain codes such as:

- `AUTH_REQUIRED`
- `PERMISSION_DENIED`
- `RESOURCE_NOT_FOUND`
- `DRAFT_CONFLICT`
- `LAST_SUPER_ADMIN`
- `LAST_PROJECT_ADMIN`
- `INVALID_DOCUMENT_CONTENT`
- `OAUTH_SCOPE_REQUIRED`

The UI localizes these codes. MCP returns structured tool errors without exposing stack traces or database details.

## Deployment

Docker Compose initially runs:

- Nuxt/Nitro application.
- PostgreSQL.
- MinIO for local development; production may use MinIO or another S3-compatible provider.
- A backup job with retention configuration.

Tesserae and Superpowers are development tools and are not runtime dependencies of Minerva.

