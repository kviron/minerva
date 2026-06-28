# Minerva progress

Last updated: 2026-06-29

## Current state

The approved Identity backend foundation is implemented and verified in the isolated `feature/identity-backend-foundation` branch. PostgreSQL, Better Auth, sessions, bootstrap, password recovery, and the existing authentication forms now work together without a page-layout redesign; the branch is ready for integration review.

## Completed

- Confirmed the workspace began empty.
- Installed the official Superpowers plugin for Codex.
- Installed Tesserae 0.10.1 as an isolated `uv` tool.
- Initialized the Git repository.
- Created the first canonical product, architecture, ADR, roadmap, and backlog documents.
- Audited the proposed MVP with Superpowers principles and reduced the first MCP boundary to documentation operations.
- Initialized and compiled the local Tesserae knowledge graph.
- Registered Tesserae as the enabled `minerva-memory` Codex MCP server.
- Created the vertical MVP delivery plan and detailed TDD plan for Slice 1.
- Scanned the canonical documents and plans for placeholders and internal scope conflicts.
- Completed the final interactive MVP audit and resolved project-bound invitations, immediate OAuth/MCP revocation, complete immutable document snapshots, and reproducible foundation setup.
- Added ADR 0005 for MCP resource binding and immediate token revocation.
- Audited the MVP information architecture and drafted the eight-screen shadcn-vue Figma prototype specification.
- Received user approval for the written UX/UI prototype specification and prepared its detailed Figma implementation plan.
- Added ADR 0006 to replace pnpm with Bun as the package manager before application implementation begins.
- Created the buildable Nuxt page-file skeleton for the approved MVP route map without UI or business behavior.
- Added public empty route stubs for Terms of Service and Privacy Policy under `/legal`.
- Added secure password recovery to the MVP design while preserving invitation-only registration.
- Added a safe Tesserae refresh wrapper that prevents the recurring Windows `WinError 183` workflow failure.
- Added public empty route stubs for password recovery under `/auth`.
- Added a local PostgreSQL 17 Docker Compose service with loopback-only access, persistent storage, and a readiness health check.
- Approved the Better Auth identity, optional profile, dynamic contact, privacy, and project-role data model, with phone authentication deferred until an SMS provider is selected.
- Preserved shared input styling when Chromium autofills credentials by overriding its text fill and covering its protected autofill background with a theme-aware inset surface.
- Added the approved static password-recovery request screen, matching sign-in styling and linked bidirectionally with `/auth`.
- Added the approved static new-password form on the tokenized reset route without exposing or processing the token.
- Added validated server environment configuration and unit/integration/browser test foundations for the Identity backend.
- Added isolated PostgreSQL test infrastructure, local Mailpit, and a database readiness endpoint.
- Added the Better Auth factory with PostgreSQL/Drizzle, email-password and username support, persistent sessions, database rate-limit storage, account status fields, password-reset settings, and the first reviewed migration.
- Added an advisory-lock-protected, idempotent first-`super_admin` bootstrap service and an interactive CLI that never accepts or prints the password as an argument.
- Added normalized email-or-username sign-in, generic credential failures, database-backed HMAC rate limiting, durable sessions, active-account enforcement, and a server-side session guard for protected Nitro handlers.
- Added enumeration-safe password recovery through SMTP/Mailpit with a 30-minute single-use token, reset throttling, sanitized delivery failures, and automatic session revocation after reset.
- Connected the existing shadcn-vue authentication forms without redesign, added client session middleware, guest/auth redirects, logout verification, pending/error states, and complete browser journeys for sign-in and recovery.
- Verified the completed Identity foundation with a frozen dependency install, two idempotent migration runs, 9 unit tests, 21 PostgreSQL integration tests, 7 browser journeys, Nuxt typecheck, and a production build.
- Used the pinned native Mailpit 1.30.0 binary for final SMTP verification because the current Docker Desktop port proxy accepted the local SMTP connection but did not relay the server greeting; Docker Compose remains the canonical development configuration.

## Remaining

- Build and review the eight-screen prototype in the supplied Figma file.
- Create detailed plans for later product slices only when the preceding slice has established their real interfaces.
