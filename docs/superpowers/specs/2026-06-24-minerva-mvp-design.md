# Minerva MVP design

Status: awaiting user review  
Date: 2026-06-24

## Summary

Minerva will be a private, bilingual project-documentation system for an internal web-production team. It will combine Confluence-like documentation, project-scoped RBAC, immutable publication history, and controlled AI access through MCP.

The audited design deliberately treats this as a sequence of vertical releases rather than one oversized implementation. The first complete product proves one secure path: invite a teammate, assign project access, author and publish documentation, search it, and let an OAuth-authorized MCP client perform the same documentation work under identical permissions.

## Evaluated approaches

### Recommended: modular monolith with vertical slices

One Nuxt/Nitro deployment owns the UI and server adapters while domain modules own business rules. PostgreSQL provides transactions, relational integrity, JSONB document storage, and full-text search. This minimizes operational overhead and keeps UI/API/MCP authorization consistent.

### Alternative: separate frontend and API services

This gives an explicit network boundary but duplicates deployment, generated types, authentication integration, and local development setup without a demonstrated scaling need.

### Alternative: microservices from the start

Independent identity, documentation, files, search, and MCP services could scale separately, but distributed transactions and authorization consistency would dominate the first release. This is rejected.

## Audit corrections

The original MVP combined too many independent product surfaces. The following corrections preserve the vision while reducing security and delivery risk:

- MCP administration of users and roles moves behind a later security review; documentation MCP remains in the first release.
- Images remain in the first release because visual project documentation needs them; generic attachments move to backlog.
- Tags, favorites, recents, review schedules, ZIP export/import, comments, realtime editing, and page-level permissions move to backlog.
- PostgreSQL search remains because both people and MCP require useful retrieval.
- Recoverable soft deletion remains, but a polished multi-entity trash center is not required initially.
- Optional TOTP remains, while mandatory MFA policy management moves to backlog.

## Architecture and data flow

Web, Nitro API, and MCP adapters authenticate a caller and construct one actor context. Shared application services validate input, evaluate permissions, execute a transaction, and append an audit event. Adapters only translate protocols and errors. A Project Admin may issue a project-bound invitation with a fixed initial role; accepting it creates or activates the account and membership atomically without granting global privileges.

Document drafts use Tiptap JSON and optimistic revision numbers. Publication creates complete immutable snapshots of the title, content, internal links, and referenced images with required change summaries. Restore copies that snapshot into a new draft while preserving the stable slug. Images used by published versions may be archived but cannot be physically deleted. Search indexes normalized published text and filters results through project membership. Images use private S3 objects and authorized access.

MCP uses Streamable HTTP. Better Auth's OAuth Provider plugin supplies OAuth 2.1 authorization and MCP-compatible discovery. Tokens are bound to the canonical MCP resource URI. Every request checks token activity, resource/audience, scope, and current RBAC. Revocation atomically invalidates consent, access tokens, and refresh tokens before the next tool call.

## Failure and recovery behavior

- Stale autosaves return `DRAFT_CONFLICT`; they never overwrite silently.
- Removing the last system or project administrator fails atomically.
- Revoked OAuth grants fail with `401 Unauthorized` on the next request before tool execution.
- Retryable MCP mutations use idempotency keys.
- Object uploads are not considered complete until metadata and storage checks succeed.
- Projects, documents, and images are archived rather than physically deleted.
- Database and object storage restore are tested together before production readiness.

## Test strategy

Every slice uses service-level unit tests, PostgreSQL integration tests, and focused browser tests. Authorization tests are table-driven across global role, project role, permission, OAuth scope, and transport. MCP tests run against a real protocol client, not only direct function calls.

## Definition of done

A slice is complete only when:

- its acceptance criteria pass;
- authorization is enforced in the service layer;
- migrations and rollback/recovery notes exist;
- Russian and English UI paths are covered where applicable;
- audit events are asserted for sensitive mutations;
- documentation and `docs/progress.md` are updated;
- Tesserae is refreshed;
- Superpowers verification finds no unsupported completion claim.
