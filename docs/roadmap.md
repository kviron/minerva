# Minerva roadmap

Status: active canonical roadmap
Last updated: 2026-08-29

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

## Slice 3.5: Audited project lifecycle completion

The lifecycle design, threat/race model, ADR 0028, and PL.0-PL.6 tests-first
plan were approved on 2026-08-29. Complete the previously scaffolded project
lifecycle with `active`, `paused`, `closed`, and `archived`; semantic
transitions; exact permissions; revision/idempotency/history; a shared
operation-aware server boundary; concurrency control; public-share, AI, MCP,
credentials, search, files, and privacy behavior; and localized Actions-based
UX. Use composition and pure entity-specific policies rather than inheritance.

PL.0 canonical adoption and permission-template correction, PL.1 pure lifecycle
and operation policies, and PL.2 persistence, migration, and the transactional
transition service are complete. PL.3 unified project-operation access and the
read-only core is next. Application implementation continues through the
approved PL.3-PL.6 vertical slices with tests first.
Project lifecycle mutation remains excluded from MCP.

Acceptance: every authenticated, public, AI, and MCP boundary observes the same
committed project state; restore is recoverable but never silently resumes work
or resurrects public links.

## Slice 4: Document core

Deliver document tree, Tiptap editor, explicit draft saves, optimistic conflicts, publication summaries, complete immutable version snapshots, full-snapshot restore with stable slugs, archive, internal links, backlinks, protected historical image references, allow-listed structured external embeds, and system templates.

Acceptance: an Editor completes the full draft-to-publish-to-restore journey while a Viewer remains read-only.

## Slice 4.5: Encrypted project credentials

Deliver user-created single-level categories, role/member allow grants, non-removable Project Admin access, encrypted credentials with ordered dynamic fields, masked Table output, explicit audited reveal, category management, and recoverable archival. Keep all credential capabilities outside MCP.

Acceptance: an Admin can create a category and grant it to a role or individual member; authorized users see only masked accessible records, revoked access fails on the next request, ciphertext is stored at rest, and inaccessible categories are indistinguishable from missing ones.

## Slice 5: Search and images

Deliver PostgreSQL full-text search, authorization-aware filtering, image upload/storage/read flow, and localized search UI.

Acceptance: search and image access cannot leak data across projects.

## Slice 6: MCP documentation interface

Deliver Better Auth OAuth Provider integration, OAuth metadata/discovery, canonical MCP resource binding, Streamable HTTP MCP endpoint, document resources/tools, scopes, grant management UI, atomic immediate revocation of consent and tokens, idempotency, rate limiting, and MCP audit attribution.

Acceptance: a real MCP client can connect, read, edit, and publish only within both delegated scopes and RBAC; the first request after grant revocation receives `401 Unauthorized`.

## Slice 6.5: Project AI assistant

Deliver dedicated encrypted provider connections, stable `project.ai.use` and `project.ai.manage` authorization, provider-neutral read-only orchestration over existing document services, a project-wide streaming assistant widget, grounded citations, private retained conversations, the short-lived server-owned proposal foundation, and atomic idempotent confirmation through shared Documents transaction primitives. End-to-end update proposal generation, review, and confirmation UI is the active next increment.

Acceptance: a currently authorized member receives a cancellable cited answer from only accessible project documentation; permission, membership, account, project, provider, and project-switch boundaries fail closed without exposing keys or content.

## Slice 7: Production readiness

Documentation Sharing slices DS.1-DS.5 are complete: revocable encrypted capabilities, dedicated published-only projections and images, authenticated management, the isolated guest reader, and abuse/release verification now form one tested boundary.

Production Readiness PR.1-PR.3 and PR.5 are complete: server-only secret-file
configuration, content-free liveness/readiness, bounded PostgreSQL/S3 probes,
required migration detection, an immutable non-root image, and the standalone
hardened Caddy/application/migration/PostgreSQL graph are implemented. All
response families now share defensive browser headers and validated request
IDs, while closed structured logs contain only bounded safe metadata. PR.4
encrypted off-host backup and restore tooling plus its local failure matrix are
complete, but the external timed drill remains open. Safe read-only audit
browsing is implemented. PR.6 release automation and clean-VPS acceptance is
next where it does not depend on the external PR.4 providers.

Deliver VPS Compose configuration, reverse-proxy guidance, backup jobs, restore drill, structured logs, audit browsing, security headers, dependency scanning, and release checklist.

Acceptance: a clean VPS deployment and documented restore test succeed.
