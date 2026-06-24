# Minerva MVP Delivery Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver Minerva as a sequence of secure, testable vertical slices, ending with OAuth-authorized MCP documentation workflows.

**Architecture:** Build a modular Nuxt/Nitro monolith. Each slice extends shared domain services and exposes them through thin web/API adapters; the MCP adapter is added only after identity, RBAC, documents, search, and audit are proven.

**Tech Stack:** Nuxt 4, Vue 3, TypeScript, pnpm, PostgreSQL, Drizzle ORM, Better Auth, shadcn-vue, Tailwind CSS, Tiptap, Vitest, Playwright, MinIO, Docker Compose, MCP TypeScript SDK.

---

## Planning rule

This file controls ordering and gates. Before implementing slices 2–7, run `superpowers:brainstorming` against the current repository and create a slice-specific plan with `superpowers:writing-plans`. Do not pre-plan later slices against assumptions invalidated by earlier implementation.

## Slice order and gates

### Slice 1: Executable foundation

Detailed plan: `docs/superpowers/plans/2026-06-24-foundation.md`

Gate:

- Clean checkout installs deterministically.
- Node, pnpm, Nuxt, and package versions are exact and upgrades are reviewed separately.
- Nuxt renders Russian and English shell routes.
- PostgreSQL and MinIO, including an idempotently initialized private bucket, are healthy through Docker Compose.
- Migration, unit-test, type-check, lint, and browser-smoke commands pass.
- CI runs the same checks.

### Slice 2: Identity and global administration

Plan after Slice 1 approval. Required outcome:

- Global and project-bound invitation-only Better Auth flows.
- Project-bound acceptance atomically creates or activates the account, assigns the fixed role, and grants no global privilege.
- Idempotent first-`super_admin` bootstrap.
- Account disabling, optional TOTP, recovery codes.
- Last-active-`super_admin` invariant.
- Auth and administration audit events.

### Slice 3: Projects and RBAC

Plan after Slice 2 approval. Required outcome:

- Project lifecycle and membership.
- Built-in and custom project roles.
- Stable permission catalog and matrix UI.
- Shared server-side evaluator.
- Last-Project-Admin and Admin safety-permission invariants.

### Slice 4: Document core

Plan after Slice 3 approval. Required outcome:

- Ordered document tree and Tiptap editor.
- Optimistic draft autosave.
- Publication summaries and complete immutable snapshots of title, content, links, and images.
- Full-snapshot restore with a stable slug, archive/restore, internal links, backlinks.
- Historical image references that prevent physical deletion while a version depends on them.
- System page templates.

### Slice 5: Search and images

Plan after Slice 4 approval. Required outcome:

- PostgreSQL full-text indexing and ranking.
- Authorization-aware draft/published search.
- Private S3-compatible image upload and authorized read flow.

### Slice 6: MCP documentation interface

Plan after Slice 5 approval and threat-model review. Required outcome:

- Better Auth OAuth Provider, MCP discovery metadata, and canonical resource binding.
- Streamable HTTP MCP endpoint.
- Project/document resources and document tools.
- Scope plus RBAC enforcement.
- Grant management, atomic invalidation of consent/access/refresh tokens, next-request revocation enforcement, idempotency, rate limiting, and AI attribution in audit.

### Slice 7: Production readiness

Plan after Slice 6 approval. Required outcome:

- VPS Compose/reverse-proxy deployment.
- Database and object-store backup jobs.
- Successful restore drill.
- Structured logs, audit browsing, security headers, dependency scanning, and release checklist.

## Cross-slice Definition of Done

- [ ] Acceptance tests for the slice pass.
- [ ] Authorization is enforced in application services.
- [ ] Sensitive mutations append expected audit records.
- [ ] Russian and English behavior is covered where user-visible.
- [ ] Database changes have generated SQL migrations.
- [ ] Operational or recovery impact is documented.
- [ ] `docs/progress.md` and affected ADRs are updated.
- [ ] Tesserae is refreshed.
- [ ] `superpowers:verification-before-completion` is run before claiming completion.
- [ ] User approves the slice before the next slice begins.
