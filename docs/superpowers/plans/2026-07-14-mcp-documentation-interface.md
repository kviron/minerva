# MCP documentation interface implementation plan

Date: 2026-07-14  
Status: approved by the user on 2026-07-14

## Goal

Deliver Slice 6 as reviewed vertical slices so a real remote MCP client can discover Minerva, authorize through Better Auth OAuth 2.1, and use project/document capabilities under both delegated scopes and current RBAC, with immediate grant revocation.

## Delivery rules

- Write failing tests before each production change.
- MCP and Nitro adapters call the same application services; they do not duplicate authorization or business rules.
- Permission codes, never role names or UI visibility, remain authoritative.
- After every completed slice, update `docs/progress.md` and run `./scripts/refresh-tesserae.ps1`.
- Do not add credential, user administration, membership, role-matrix, settings, or super-admin MCP capabilities.

## Slice 6.1: package and schema spike

1. Pin a Better Auth OAuth Provider version compatible with the repository's pinned Better Auth version; do not use `latest` in the application.
2. Generate the plugin schema into a temporary review artifact and compare it with the existing Drizzle auth schema.
3. Add contract tests proving resource indicators, opaque/server-checked token behavior, consent identity, refresh-token linkage, and available revocation APIs.
4. If the plugin cannot atomically revoke consent plus all derived tokens, add a Minerva-owned grant linkage table and record the choice in a new ADR before implementation.
5. Produce and review an additive migration; it must not weaken existing Identity constraints or expose token plaintext.

Acceptance: the pinned package behavior needed by ADR 0005 is demonstrated by tests, not assumed from documentation.

## Slice 6.2: OAuth provider and discovery

1. Add validated environment configuration for issuer and canonical MCP resource URI.
2. Extend `createMinervaAuth` with the pinned OAuth Provider plugin, the closed initial scope set, explicit valid audience, consent route, database rate limiting, PKCE S256, and dynamic registration disabled.
3. Add Nitro forwarding for OAuth authorization-server metadata when the existing catch-all route cannot serve the required well-known path.
4. Add RFC 9728 protected-resource metadata for the canonical `/mcp` resource.
5. Add unit tests for canonical URI normalization and integration tests for metadata, resource indicators, unknown scopes, redirect URI validation, and public-client PKCE.

Acceptance: an external client can discover the authorization server from the protected resource and complete authorization without any MCP tool existing yet.

## Slice 6.3: consent and grant management

1. Add authenticated Russian-first consent UI showing client identity, exact scopes, and explicit allow/deny actions; English remains the secondary locale.
2. Add a protected settings page listing active grants without tokens or secrets.
3. Implement a shared grant-revocation service that locks the grant and atomically invalidates consent, refresh tokens, access tokens, and records the audit event.
4. Route both the web action and any OAuth lifecycle hook through that service.
5. Test ownership, stale forms, repeated revocation, concurrent token refresh, disabled users, and the first request after commit.

Acceptance: the user can inspect and revoke a grant, and neither access nor refresh tokens derived from it remain usable.

## Slice 6.4: authenticated Streamable HTTP shell

1. Add the MCP SDK at an exact reviewed version and expose one `/mcp` Streamable HTTP endpoint.
2. Implement a transport-independent bearer validator returning a discriminated actor result with user, client, grant, resource, scopes, locale, and request ID.
3. Validate token activity, issuer, resource/audience, account status, origin, method, content type, body size, and rate limit before parsing or dispatch.
4. Add safe JSON-RPC error mapping and `WWW-Authenticate` responses.
5. Register only capability metadata and a harmless authenticated server-info response.

Acceptance: inactive or wrongly targeted tokens cannot reach dispatch; no session or error leaks secrets.

## Slice 6.5: read-only project and document capabilities

1. Add closed scope-to-capability constants and tests.
2. Register project list/read, document tree/read, version/history, backlinks, and search capabilities.
3. Add thin MCP adapters over existing Projects, Documents, Search, and Files services; extract shared application services first wherever an HTTP handler still owns logic.
4. Preserve project-scoped not-found behavior and published/draft search visibility.
5. Test Viewer, Editor, Admin, cross-project IDs, archived content, missing history permission, lost membership, account disabling, and grant revocation.

Acceptance: read outcomes match HTTP behavior and cannot leak drafts or data from another project.

## Slice 6.6: mutation idempotency foundation

1. Add an additive table keyed by grant, tool, project, and idempotency key with validated request hash, lease state, safe terminal result, timestamps, and bounded retention.
2. Implement a shared idempotency coordinator with no document business rules.
3. Reject a reused key with a different input hash and return the stored safe result for identical completed requests.
4. Add concurrency, crash/lease-expiry, cross-grant, cross-project, and token-revocation tests.

Acceptance: retrying a mutation cannot duplicate business effects or cross authorization boundaries.

## Slice 6.7: document mutation tools

1. Add create and explicit draft-update tools under `documents:write`; retain optimistic draft revision conflicts.
2. Add move, archive, and restore tools under `documents:write` using the existing services and exact permission codes.
3. Add publish under `documents:publish`; it must not be implied by `documents:write`.
4. Require idempotency keys for every mutation and attach channel `mcp`, client, grant, scopes, tool, request ID, and outcome to content-free audit events.
5. Test duplicate delivery, scope/RBAC matrices, concurrent edits, archived branches, version preservation, and revocation races.

Acceptance: an Editor completes create → save → publish through MCP while a Viewer remains read-only and a client without publish scope cannot publish.

## Slice 6.8: real-client acceptance and hardening

1. Add a real MCP client fixture that performs discovery, PKCE authorization, read, draft update, publish, refresh, grant revocation, and rejected post-revocation access.
2. Add abuse tests for invalid origins, oversized bodies, malformed JSON-RPC, unknown tools, schema extras, rapid requests, and resource mismatch.
3. Audit logs, error output, and database projections for forbidden data.
4. Document local setup, production issuer/resource configuration, reverse-proxy trust, key rotation, rate limits, and incident revocation.
5. Run unit, PostgreSQL integration, MCP acceptance, browser consent/grant journeys, typecheck, production build, migration validation, and Tesserae refresh.

Acceptance: a real client meets Slice 6 acceptance criteria and the security invariants in the approved threat model.

## Expected implementation areas

- `server/modules/identity/auth/` for provider configuration and OAuth lifecycle integration.
- `server/modules/mcp/` for validation, transport mapping, schemas, capability registration, and idempotency coordination.
- `server/api/.well-known/` and `server/api/mcp/` for thin Nitro adapters.
- `app/features/oauth-grants/` and settings/auth pages for consent and grant management.
- `server/infrastructure/database/schema/` and additive Drizzle migrations for plugin/grant/idempotency state.
- `tests/unit/mcp/`, `tests/integration/mcp/`, and browser journeys for the matrices above.

Exact filenames and plugin schema are intentionally finalized only after Slice 6.1 proves the pinned dependency interfaces.
