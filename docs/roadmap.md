# Minerva roadmap

Status: proposed after Superpowers audit

## Slice 0: Project memory and approved design

Deliver Superpowers, Tesserae, canonical documentation, ADRs, and implementation plans. No application code begins until user approval.

## Slice 1: Executable foundation

Deliver a reproducible Nuxt 4 workspace, lint/type/test commands, PostgreSQL and MinIO development services, Drizzle migrations, health checks, CI, environment validation, and Russian/English shell pages.

Acceptance: a clean checkout starts through documented commands and all checks pass.

## Slice 2: Identity and global administration

Deliver Better Auth email/password login, invitation-only enrollment, session protection, `super_admin` bootstrap, account disabling, optional TOTP, recovery codes, and global audit events.

Acceptance: no public registration exists; the last active `super_admin` invariant is enforced in services and tests.

## Slice 3: Projects and RBAC

Deliver project lifecycle, memberships, role templates, custom project roles, permission matrix UI, shared permission evaluator, and last-Project-Admin protection.

Acceptance: authorization results match across UI and API, and inaccessible projects are indistinguishable from missing projects where appropriate.

## Slice 4: Document core

Deliver document tree, Tiptap editor, draft autosave, optimistic conflicts, publication summaries, immutable versions, restore, archive, internal links, backlinks, and system templates.

Acceptance: an Editor completes the full draft-to-publish-to-restore journey while a Viewer remains read-only.

## Slice 5: Search and images

Deliver PostgreSQL full-text search, authorization-aware filtering, image upload/storage/read flow, and localized search UI.

Acceptance: search and image access cannot leak data across projects.

## Slice 6: MCP documentation interface

Deliver Better Auth OAuth Provider integration, OAuth metadata/discovery, Streamable HTTP MCP endpoint, document resources/tools, scopes, grant management UI, revocation, idempotency, rate limiting, and MCP audit attribution.

Acceptance: a real MCP client can connect, read, edit, and publish only within both delegated scopes and RBAC.

## Slice 7: Production readiness

Deliver VPS Compose configuration, reverse-proxy guidance, backup jobs, restore drill, structured logs, audit browsing, security headers, dependency scanning, and release checklist.

Acceptance: a clean VPS deployment and documented restore test succeed.

