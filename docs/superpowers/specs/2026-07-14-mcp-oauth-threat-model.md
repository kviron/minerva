# MCP OAuth threat model and design

Date: 2026-07-14  
Status: approved by the user on 2026-07-14

## Scope

This design covers Minerva's first remote Streamable HTTP MCP endpoint, its Better Auth OAuth 2.1 provider integration, protected-resource discovery, delegated documentation scopes, grant management, and immediate revocation. It does not authorize implementation until the user accepts this design and the accompanying plan.

The first release exposes only project discovery and documentation operations already allowed by `docs/product-spec.md`. Credentials, users, invitations, memberships, role mutation, global settings, and super-administration remain unavailable through MCP.

## Security invariants

- The canonical protected resource is one configured absolute HTTPS URI ending in `/mcp`; development may use an explicitly configured loopback HTTP URI. Comparison uses parsed URL serialization, rejects credentials, fragments, query strings, dot-segments, and alternate trailing-slash forms, and never derives trust from `Host` or forwarded headers.
- Authorization and token requests must carry that exact resource indicator. Tokens issued for another audience are rejected.
- Every MCP request checks bearer-token activity, issuer, resource/audience, expiry, delegated scopes, active user status, active project membership, and current permission codes before dispatch.
- OAuth scopes restrict the client; they never grant a project permission. Shared application services remain the only business-rule implementation for HTTP and MCP.
- Revoking a grant atomically invalidates its consent, refresh tokens, and all derived access tokens. The first later request fails with `401` before JSON-RPC or tool dispatch.
- Raw authorization codes, access tokens, refresh tokens, client secrets, private document content, search queries, uploaded bytes, database connections, and object-store paths never enter logs or audit metadata.
- Credentials and every credential-related capability remain absent from MCP discovery, resources, prompts, and tools.

## Assets and trust boundaries

Protected assets are private project metadata, document drafts and versions, image references and bytes, OAuth grants and tokens, user identity, audit integrity, and service availability.

The trust boundaries are:

1. MCP client to public Nitro endpoint.
2. Nitro MCP adapter to token validation and grant storage.
3. Authenticated actor context to shared Projects, Documents, Search, Files, Authorization, and Audit services.
4. Application services to PostgreSQL and private S3-compatible storage.
5. Browser session to consent and grant-management UI.

Client-provided project IDs, document IDs, cursors, request IDs, locale, resource indicators, redirect URIs, `Origin`, and JSON-RPC/tool arguments are untrusted.

## Threats and required controls

### Token theft and replay

Use short-lived bearer access tokens, hashed token persistence, TLS in production, `Cache-Control: no-store`, and redaction at all logging boundaries. Validate active state on every request. Rate-limit by a privacy-preserving combination of token/grant identity, client, and trusted proxy IP. Do not accept tokens through query parameters or cookies.

### Audience confusion and malicious resource servers

Publish RFC 9728 protected-resource metadata and require RFC 8707 resource indicators. Keep one exact configured resource URI in authorization-server metadata, token issuance, and resource-server validation. A mismatch fails with `401` and a standards-compatible `WWW-Authenticate` challenge without revealing project existence.

### Stale authorization

Never encode project membership or permission decisions as durable token claims. Resolve the user and current RBAC for every operation. Account disabling, membership removal, role changes, project archival, and grant revocation therefore apply on the next request.

### Over-broad delegation

The closed initial scope set is `projects:read`, `documents:read`, `documents:write`, and `documents:publish`. Consent displays exact requested scopes and the client identity. Unknown or administrative scopes are rejected. Scope-to-operation mappings are closed constants with tests; `documents:write` does not imply publish.

### Confused deputy and cross-project access

Tool inputs carry explicit project and entity IDs. Services re-resolve ownership and authorization server-side and return indistinguishable not-found results for missing and inaccessible entities where the product requires it. The MCP adapter never calls repositories directly.

### CSRF, login CSRF, redirect abuse, and client impersonation

Keep Better Auth origin and CSRF checks enabled. Authorization code clients must use PKCE S256 and exact registered redirect URIs. Consent mutations require the authenticated browser session. Dynamic client registration is disabled in the first vertical slice; enabling it requires a separate reviewed policy for public-client metadata and redirect validation. No client bypasses consent in the first release.

### Grant revocation races

Store a Minerva grant identity linking consent, user, client, resource, access tokens, and refresh tokens. Revoke the complete graph in one PostgreSQL transaction and append the audit event in that transaction. Token validation reads the active grant/token state before dispatch; mutation services repeat authorization within their transaction. Concurrent revocation may allow only a request whose authorization check completed before the revocation transaction committed; every request beginning after commit must fail.

### Mutation replay and duplicate delivery

Every mutation tool requires an idempotency key scoped to grant, tool name, and project. Persist a request hash and terminal safe result. Reusing a key with different validated input is a conflict; identical retries return the recorded result. In-progress leases expire safely and never bypass optimistic draft revisions.

### Schema and content attacks

Use strict bounded schemas, reject unknown fields, cap batch sizes and string lengths, preserve existing Tiptap validation, and never render or execute model-supplied HTML. Search remains bounded and authorized. Image reads reuse the Files service and never disclose object keys.

### Session fixation and transport abuse

The MCP endpoint accepts only supported Streamable HTTP methods and content types, validates `Origin`, caps body size, limits concurrent sessions, and applies timeouts. Session identifiers are opaque, unpredictable, user/client-bound, and never substitute for bearer validation. Invalid JSON-RPC is rejected before tool execution.

### Information leakage through discovery and errors

Discovery exposes only stable names, descriptions, JSON schemas, and the canonical resource metadata. Errors use stable machine codes and request IDs without stack traces, SQL, raw paths, authorization details, or private existence signals. Audit metadata is content-free.

## Scope-to-capability mapping

| OAuth scope | MCP capabilities | Required current RBAC |
| --- | --- | --- |
| `projects:read` | list/read accessible project projections | `project.view` |
| `documents:read` | tree, page, versions, backlinks, search, authorized image read | relevant document read/history permission |
| `documents:write` | create, explicit draft update, move, archive, restore | exact existing document mutation permission |
| `documents:publish` | publish a saved draft | `documents.publish` |

Each operation declares exactly one minimum OAuth scope plus its existing permission-code checks. Operations needing multiple business permissions retain those service-level checks.

## Token strategy

ADR 0005 requires server-side activity checking, so the resource server must not treat local JWT verification as sufficient. The preferred first release uses opaque access tokens backed by hashed PostgreSQL state, or a Better Auth verification path augmented by a mandatory active grant/token lookup. The implementation spike must prove the exact behavior of pinned Better Auth packages before schema acceptance.

Refresh-token rotation must invalidate the consumed refresh token. User grant deletion must remove or deactivate the consent and every token derived from the grant, rather than invoking access-token-only revocation.

## Audit events

Record consent granted/denied, token issuance metadata, grant revocation, rejected post-revocation use, MCP connection outcome, and every tool outcome. Events contain actor user ID, OAuth client ID, grant ID, scopes, channel `mcp`, tool, project/entity IDs, request ID, outcome, and content-free before/after metadata. Store only token fingerprints produced by a keyed one-way function when correlation is necessary.

## Verification gates

- Discovery works from a real MCP client using protected-resource and authorization-server metadata.
- Wrong issuer, resource, audience, expiry, inactive token, disabled user, revoked grant, missing scope, and lost RBAC all fail before dispatch.
- Revocation blocks the first request started after commit and prevents refresh-token reuse.
- Viewer, Editor, and Admin outcomes match the existing HTTP services.
- Cross-project IDs, archived entities, malformed schemas, oversized input, replayed mutations, and concurrent draft conflicts have integration coverage.
- Audit and application logs contain no raw token, authorization code, secret, document body, search query, image bytes, database URL, or object path.

## Approval decisions

User approval of this design accepted ADR 0004 and ADR 0005. Dynamic client registration remains deferred. The production canonical MCP URI remains deployment configuration and must be fixed before issuing production grants.
