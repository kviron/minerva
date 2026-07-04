# Minerva progress

Last updated: 2026-07-04

## Current state

The approved Identity foundation and global-navigation slice are implemented and verified. Authenticated users now land on Dashboard, the sidebar obtains a server-filtered menu through the Navigation feature, and unfinished Dashboard and Project Credentials routes share an intentional development state without storing or exposing credentials.

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
- Verified the completed Identity foundation with a frozen dependency install, two idempotent migration runs, 9 unit tests, 22 PostgreSQL integration tests, 8 browser journeys, Nuxt typecheck, and a production build.
- Used the pinned native Mailpit 1.30.0 binary for final SMTP verification because the current Docker Desktop port proxy accepted the local SMTP connection but did not relay the server greeting; Docker Compose remains the canonical development configuration.
- Completed the Identity functional refactor with shared `ObjectConst` values and derived types, scenario-based module grouping, pure `Result` classification, and dependency-injected rate-limit, sign-in, recovery, and session effects.
- Added the repository-local `functional-typescript` skill and the repository Nuxt MCP configuration.
- Verified the Identity refactor on 2026-06-29 with a frozen dependency install, 24/24 unit tests across 9 files, 22/22 PostgreSQL integration tests across 6 files, Nuxt typecheck, a production build, an unchanged Drizzle tree, a valid repository skill, the enabled repository Nuxt MCP, and a clean diff check. After removing a stale worktree-local Nuxt prepare process, a cold-start browser run passed 7/8 because the unchanged guest redirect exceeded its timeout; that guest case then passed twice in isolation, and the final full browser run passed 8/8.
- Established the Nuxt-native feature-module convention with Identity as the reference implementation: API, model, and UI separation; vee-validate/Zod forms; explicit imports through the feature public API; and page-owned reset-route token handling, with visual and server behavior unchanged. Verification completed with a frozen install (1,013 installs across 1,174 packages, no changes), 58/58 unit tests across 14 files, 22/22 PostgreSQL integration tests across 6 files, 8/8 browser journeys, Nuxt typecheck, a production build, an unchanged Drizzle tree, and a clean diff check. The requested Docker Compose start exited 1 because another healthy Minerva PostgreSQL test container already owned port 5433; verification used that healthy PostgreSQL service and its healthy pinned Mailpit 1.30.0 companion on ports 1025/8025.
- Made Nuxt pages and application Nitro APIs authenticated by default; approved public sign-in, recovery, invitation, legal, and readiness routes remain public, while global administration uses the server-resolved `superAdmin` flag.
- Authorization now uses a browser-safe typed session boundary, request-scoped session reuse, and a single API access vocabulary without changing access behavior.
- Added the protected Dashboard landing page, a shared authenticated-page development placeholder used only by Dashboard and Project Credentials, and a typed global Navigation feature. The server returns Dashboard, Projects, and Settings to every authenticated user and adds Administration only for strict `superAdmin === true`; the sidebar localizes stable labels, resolves icons through a closed Lucide registry, uses the design-system `SidebarMenuSkeleton`, and keeps Credentials outside global navigation and MCP. Verification on 2026-07-02 passed 167/167 unit tests, 22/22 PostgreSQL integration tests, 17/17 single-worker browser journeys, Nuxt typecheck, and the production build.
- Added the Identity feature's public `CurrentUserMenu` to the authenticated sidebar, backed by the real safe Better Auth session projection for name, email, and an optional validated avatar with an initials fallback. The menu links to the profile, logs out by revoking the server session, and removes the demo Billing and Notifications actions. Isolated the browser rate-limit fixture so authentication E2E scenarios do not share throttle state. Verification on 2026-07-04 passed `bun run test:unit` (209/209 tests across 33 files), `bun run test:integration` (22/22 tests across 6 files), `bun run typecheck`, `bun run build`, and `bun run test:e2e` (18/18 browser journeys).
- Replaced the authenticated header's template GitHub link with the shared localized light, dark, and system theme selector. Verification on 2026-07-04 passed the complete unit suite (214/214 tests across 35 files), Nuxt typecheck, and the production build.

## Remaining

- Build and review the eight-screen prototype in the supplied Figma file.
- Create detailed plans for later product slices only when the preceding slice has established their real interfaces.
