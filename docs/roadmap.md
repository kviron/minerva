# Minerva roadmap

Status: proposed after Superpowers audit

## Slice 0: Project memory and approved design

Deliver Superpowers, Tesserae, canonical documentation, ADRs, an approved Figma UX/UI prototype, and implementation plans. No application code begins until user approval.

## Slice 1: Executable foundation

Deliver a reproducible Nuxt 4 workspace with exact Node, Bun, Nuxt, and dependency versions; lint/type/test commands; PostgreSQL and MinIO development services; idempotent bucket initialization; Drizzle migrations; health checks; CI; environment validation; and Russian/English shell pages.

Acceptance: a clean checkout starts through documented commands and all checks pass.

## Slice 2: Identity and global administration

Deliver Better Auth email/password and username login, enumeration-safe password recovery, global and project-bound invitation enrollment, atomic user/profile/project-membership creation, optional profile fields, private and shared-project contacts, session protection, `super_admin` bootstrap, account disabling, optional TOTP, recovery codes, and global audit events. Reserve an optional unique phone number for later OTP-verified phone authentication without enabling phone sign-in in this slice.

Acceptance: no public registration exists; the last active `super_admin` invariant is enforced in services and tests.

## Slice 3: Projects and RBAC

Deliver project lifecycle, memberships, role templates, custom project roles, permission matrix UI, shared permission evaluator, and last-Project-Admin protection.

Acceptance: authorization results match across UI and API, and inaccessible projects are indistinguishable from missing projects where appropriate.

## Slice 4: Document core

Deliver document tree, Tiptap editor, draft autosave, optimistic conflicts, publication summaries, complete immutable version snapshots, full-snapshot restore with stable slugs, archive, internal links, backlinks, protected historical image references, and system templates.

Acceptance: an Editor completes the full draft-to-publish-to-restore journey while a Viewer remains read-only.

## Slice 5: Search and images

Deliver PostgreSQL full-text search, authorization-aware filtering, image upload/storage/read flow, and localized search UI.

Acceptance: search and image access cannot leak data across projects.

## Slice 6: MCP documentation interface

Deliver Better Auth OAuth Provider integration, OAuth metadata/discovery, canonical MCP resource binding, Streamable HTTP MCP endpoint, document resources/tools, scopes, grant management UI, atomic immediate revocation of consent and tokens, idempotency, rate limiting, and MCP audit attribution.

Acceptance: a real MCP client can connect, read, edit, and publish only within both delegated scopes and RBAC; the first request after grant revocation receives `401 Unauthorized`.

## Slice 7: Production readiness

Deliver VPS Compose configuration, reverse-proxy guidance, backup jobs, restore drill, structured logs, audit browsing, security headers, dependency scanning, and release checklist.

Acceptance: a clean VPS deployment and documented restore test succeed.
