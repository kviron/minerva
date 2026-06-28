# Minerva progress

Last updated: 2026-06-29

## Current state

The user approved the audited Identity backend design and implementation plan, so its application implementation gate is open. Work is proceeding in the isolated `feature/identity-backend-foundation` branch; page layout remains unchanged while the PostgreSQL and authentication foundation is built in tested vertical slices.

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

## Remaining

- Build and review the eight-screen prototype in the supplied Figma file.
- Complete and verify the approved Identity backend slices: first-super-admin bootstrap, identifier sign-in, session guards, password recovery, and existing-form wiring.
- Create detailed plans for later product slices only when the preceding slice has established their real interfaces.
