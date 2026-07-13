# Project Credentials Implementation Plan

**Goal:** Deliver encrypted project credentials with user-created single-level categories, role/member grants, masked table output, and safe Project Admin management.

**Architecture:** A shared Credentials application module owns authorization, category ACL evaluation, authenticated encryption, audit-safe commands, and projections. Thin Nitro handlers and a Nuxt-native feature consume that boundary. Plaintext never appears in list contracts or MCP.

## Slice 1: Contracts, permissions, and schema

- [x] Test the eight new permission codes and Admin-only built-in defaults first.
- [x] Test categories, role/member grants, credentials, fields, same-project constraints, ordering, uniqueness, and archival in PostgreSQL.
- [x] Add closed-set shared types and an additive reviewed Drizzle migration.

## Slice 2: Encryption boundary

- [x] Test round trip, randomized ciphertext, associated-data binding, wrong key/version, tamper failure, and redacted errors.
- [x] Add validated versioned-key configuration and dependency-injected encrypt/decrypt capability.
- [x] Document and test primitive, nonce strategy, associated data, rotation, backup, and recovery before production use.

## Slice 3: Category authorization and services

- [x] Test no seeded categories, Admin invariant, role grant, member grant, union access, inactive/foreign subject rejection, revocation, and indistinguishable 404s.
- [x] Implement shared ACL evaluation and transactional create/update/archive/replace-grants services.
- [x] Add sanitized audit events with no private or secret values.

## Slice 4: Credential services and HTTP adapters

- [x] Test create/update/archive, active required category, ordered fields, keep/replace/clear, masked list, one-field reveal, no-store, rate limiting, and audit.
- [x] Implement strict contracts and thin handlers deriving actor, project, and channel from session/route.
- [x] Prove credential capabilities are absent from MCP and inaccessible categories leak no metadata.

## Slice 5: Category UI

- [x] Load current shadcn-vue docs; add only missing Sheet, Field, selection, AlertDialog, Empty, and Skeleton primitives with Bun.
- [x] Test and implement empty state, category list, titled create/edit Sheet, role/member grants, immutable Admin explanation, safe errors, and archive confirmation.

## Slice 6: Credential table and editor

- [x] Test safe filters, Table columns, masks, rightmost three-dot `DropdownMenu` with only `Редактировать`, and permission-aware actions.
- [x] Test title/category validation, login/password, dynamic add/remove/reorder, types, keep/replace/clear, and plaintext clearing on close.
- [x] Implement the Table and titled Sheet with semantic shadcn-vue composition and Lucide icons.

## Slice 7: Browser journeys and completion

- [x] Test Admin category/grant management, allowed reveal, immediate revoked access, denied mutation, and cross-project 404.
- [x] Run unit, PostgreSQL integration, single-worker E2E, typecheck, production build, migration check, and secret-leak scan.
- [x] Update progress and refresh Tesserae through `./scripts/refresh-tesserae.ps1`; never stage generated indexes, secrets, uploads, backups, or `.env`.
