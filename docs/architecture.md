# Minerva architecture

Status: active canonical architecture
Last updated: 2026-08-29

## Architectural style

Minerva is a modular monolith deployed as one Nuxt/Nitro application with PostgreSQL and S3-compatible object storage. Web pages, Nitro API handlers, background jobs, and MCP transport adapters call the same application services. Transport code never owns business rules.

This keeps the first release operable on one VPS while preserving boundaries that can later be separated if load or security demands it.

## Client application structure

Client features place effectful operations in entity-scoped `BaseActions` subclasses under `model/actions`. Actions are stateless services over concrete feature API adapters: every business input is an explicit method argument, results are returned to the caller, and actions never import, read, or mutate Pinia stores. The calling UI or feature composition boundary explicitly applies returned safe projections to its store. Pinia stores own server projections, editor drafts, transient UI values, and deterministic transformations but perform no HTTP or clipboard effects. `createAsyncAction` and `createSyncAction` provide shared pending, cancellation, safe-error, and value-free analytics orchestration through named definition objects. Features must not combine unrelated entities into one action façade. Server permission checks remain authoritative under ADR 0013.

The client keeps Nuxt's standard `app/pages`, `app/layouts`, and `app/middleware` entry points. Business capabilities live as vertical modules below `app/features/<feature>` with optional `api`, `model`, and `ui` directories and a deliberate public `index.ts`.

Pages own routes, layouts, route parameters, and composition. Feature UI owns feature-specific presentation, models own schemas and interaction state, and API adapters own HTTP or external-client calls. Business forms use `vee-validate` with Zod while Nitro validation and server-side authorization remain authoritative.

The dependency direction is `pages/layouts -> feature public API -> ui -> model -> api`. Features may also use `app/components/ui`, `app/lib`, and browser-safe root `shared` contracts. Feature internals are private, shared UI primitives do not depend on features, and cross-feature orchestration belongs in pages by default.

Do not auto-scan `app/features`; explicit imports preserve visible boundaries. Do not use Nuxt Layers for ordinary business features. Reconsider Layers when a substantial partial Nuxt application must be reused across applications, distributed independently, or overridden as platform configuration. See ADR 0008.

## TypeScript typing

Prefer contextual typing and control-flow narrowing over type assertions. Type the enclosing state, function parameters, and return values so that object literals, `null`, empty arrays, and empty records are checked without property-level `as` expressions. Pinia option stores declare an explicit state return type instead of asserting each initial value.

Values from untyped external boundaries must be validated with schemas, parsers, or type guards before entering application code. Do not use `as SomeType` or non-null assertions (`!`) merely to silence the compiler. `as const` remains appropriate for literal preservation and closed sets. If an external library boundary makes an assertion unavoidable, isolate it at that boundary and document why it is safe.

## Module boundaries

### Identity

Owns Better Auth configuration, credential accounts, sessions, email and username identity, future verified phone identity, global and project-bound invitations, TOTP, account status, global `super_admin`, OAuth grants, token lifecycle, and OAuth 2.1 provider behavior. Accepting a project-bound invitation creates or activates the account, profile, and membership in one transaction.

### Profiles

Owns optional personal names, biography, date of birth, job title, avatar association, locale, time zone, ordered messenger and social contacts, and profile visibility. It depends on Identity for the user lifecycle, Files for authorized avatar access, and Authorization for shared-project visibility decisions.

### Authorization

Owns permission definitions, project roles, role-permission assignments, memberships, last-admin invariants, and permission evaluation.

### Projects

Owns project metadata and the `active | paused | closed | archived` lifecycle.
Lifecycle reuse is compositional: shared closed vocabularies, pure
entity-specific transition and operation policies, discriminated decisions,
and a Projects application service for authorization, persistence, effects,
history, and audit. Business entities do not inherit from a lifecycle base
class, and clients cannot set status directly.

Every project-bound module uses a server-only operation-aware project access
boundary that combines active account, global super-admin bypass or active
membership, exact permission code, project lifecycle state, and operation
mode. Authenticated reads may continue in paused/closed projects; work
mutations are active-only; approved access-reducing security operations are
classified explicitly; archived projects deny ordinary access. AI and MCP are
active-only. Public reads remain available while paused/closed, while archive
atomically revokes public capabilities. Resource-wide OAuth grants are not
revoked by one project transition.

Transitions use semantic commands, expected lifecycle revision, and a
caller-generated transition ID. The project row, immutable lifecycle history,
transactional side effects, and content-free audit attribution change in one
transaction. Project-bound mutations coordinate with transitions using a
tested project-row locking protocol. External S3/provider work occurs outside
long locks and rechecks lifecycle before attaching results. Lifecycle
administration is not registered as MCP tools.

### Documents

Owns document trees, draft concurrency, Tiptap validation, publication, complete immutable snapshots, restore behavior, links, backlinks, allow-listed external embeds, public sharing, and templates. Public sharing uses a dedicated `documents.share` permission and revocable capability records: only a SHA-256 lookup hash and a context-bound versioned encrypted token envelope persist, while plaintext exists transiently for create/copy responses. Public reads are a separate boundary over latest immutable published snapshots and never impersonate a user or reuse draft-bearing authenticated projections. Guest route and API classifiers allow only exact capability-shaped paths; public failures return explicit neutral JSON instead of framework error serialization, preventing request URLs, tokens, and stacks from entering the response. The public client has its own action/store/layout and never retains the capability in Pinia. Create and draft-update business rules are transaction-aware primitives: ordinary Nitro and MCP use cases open their own transaction, while an approved AI proposal calls the same primitive inside the proposal's caller-owned transaction. Mutation attribution is a closed `mcp | ai` union, and audit metadata remains content-free. External embeds persist only versioned structured descriptors; provider URL normalization is pure and shared, while Documents remains authoritative over which nodes are allowed. User-supplied HTML, iframe markup, scripts, and arbitrary embed origins are never stored or executed. A version snapshot fixes the title, content, internal-link targets, referenced image IDs, and embed descriptors; restore keeps the document's current slug.

### Credentials

Owns user-created single-level credential categories, role/member category grants, encrypted credential values, ordered dynamic fields, masking, explicit reveal, key-version metadata, and recoverable archival. It depends on Authorization for active membership and stable permission decisions and on Audit for secret-free events. Project Admin has implicit non-removable access to every category. Credentials expose no MCP resources or tools.

### AI Assistant

Owns dedicated encrypted provider connections, provider-neutral chat orchestration, bounded streaming, documentation-tool adapters, citations, private user-owned conversation history, usage metadata, and short-lived owner-scoped document proposals. It executes as the signed-in user and asks Authorization for current `project.ai.use` or `project.ai.manage` decisions. Read tools call existing Documents application services directly; they do not call Minerva over HTTP or MCP. Visible conversation messages use the accepted 30-day activity retention and 7-day recoverable-deletion policy; hidden prompts and raw tool/provider data are never conversation records. Proposal payloads remain in PostgreSQL for 15 minutes, clear on every terminal transition, and leave only a content-free receipt for at most 24 hours. Confirmation locks the owner/project-scoped proposal, rechecks the active account, project, membership, permission, target, parent, revision, images, and internal document references, then commits the shared Documents mutation, content-free audit, and terminal receipt atomically; concurrent replay returns that receipt. Provider secrets are isolated from Credentials, and model output cannot invoke document mutation services without a Minerva-owned proposal and explicit current confirmation.

### Search

Owns document text extraction, PostgreSQL search vectors, ranking, filters, and authorization-aware result queries.

### Files

Owns image metadata, validation, S3 object keys, upload completion, authorized reads, and lifecycle cleanup. Images referenced by published versions may be archived but not physically deleted. Raw object-store credentials never leave the server.

### Audit

Owns append-only security and business events. Events include actor, channel (`web`, `api`, `mcp`, `system`), client identity, target, request ID, outcome, and structured metadata.

### MCP

Owns Streamable HTTP framing, capability/resource/tool registration, canonical resource metadata, OAuth token activity and audience validation, scope enforcement, schema validation, idempotency, and translation to shared application-service calls.

## Request flow

1. A web, API, or MCP adapter authenticates the caller. MCP rejects inactive or wrongly targeted tokens before tool dispatch.
2. It builds an actor context containing user ID, global flags, project membership, OAuth client, scopes, locale, and request ID.
3. An application service validates input and asks Authorization for a permission decision.
4. The service executes one transaction and appends its audit event.
5. The adapter maps domain results to localized UI messages or stable machine error codes.

## Data rules

- Use UUID primary keys.
- Use UTC timestamps in storage and locale-aware rendering at the edge.
- Use soft deletion for projects, documents, and images in the first release.
- Store Tiptap JSON as `jsonb`; store search text and `tsvector` separately.
- Store external document embeds as strict provider descriptors and construct iframe URLs in reviewed provider adapters; every provider origin requires an explicit CSP entry.
- Number published document versions monotonically per document inside a transaction.
- Store internal links as stable source/target IDs with link type and version/draft origin.
- Store immutable version references to image IDs and prevent physical deletion while any published version references an image.
- Use a numeric draft revision for optimistic concurrency.
- Store credential values only as authenticated ciphertext with versioned keys held outside PostgreSQL; authorized list projections may contain login plaintext under ADR 0011 but never password plaintext.

## Error contract

Application services return stable domain codes such as:

- `AUTH_REQUIRED`
- `PERMISSION_DENIED`
- `RESOURCE_NOT_FOUND`
- `DRAFT_CONFLICT`
- `LAST_SUPER_ADMIN`
- `LAST_PROJECT_ADMIN`
- `INVALID_DOCUMENT_CONTENT`
- `OAUTH_SCOPE_REQUIRED`

The UI localizes these codes. MCP returns structured tool errors without exposing stack traces or database details.

## Deployment

Production runtime configuration keeps parsing contracts pure and moves file
I/O into a server-only boundary. Approved secret values may be supplied directly
for development or through one mutually exclusive, bounded `_FILE` reference in
production; resolved values still pass the same strict schemas. Liveness has no
dependency I/O. Readiness fails closed unless configuration, PostgreSQL, the
minimum required Drizzle migration, and the private S3 bucket all pass bounded
content-free probes.

Development Compose runs PostgreSQL, test PostgreSQL, Mailpit, and MinIO.
Production uses an independent graph containing Caddy, a same-image one-shot
migration job, the non-root Nitro/Bun application, and PostgreSQL. Only Caddy
publishes host ports; production object storage is external and versioned.
Application containers use read-only roots, dropped capabilities,
no-new-privileges, bounded tmpfs, and private backend networking.

One server-owned response policy covers every HTTP family. Caddy owns HSTS and
automatic HTTPS; the application owns CSP and the remaining browser controls.
A Nitro boundary validates or creates one UUID request ID and emits a closed
JSON log projection containing only time, level, fixed event, request ID,
method, redacted route template, status, and duration. Request headers, bodies,
queries, full URLs, domain content, credentials, paths, provider errors, and
exception details are outside that logger's input type and runtime adapter.

Daily PostgreSQL 17 custom-format dumps are checksummed, paired with a
content-free release/migration manifest, encrypted into an external restic
repository, and retained at 7 daily, 4 weekly, and 6 monthly snapshots. Weekly
integrity/freshness checks and persistent systemd timers share a host lock.
Recovery is a separate Compose graph and fails unless the dump checksum,
database families, independently escrowed encryption-key versions, and
recovered private-object inventory all verify. Production readiness still
requires a measured drill against the selected off-host providers.

Tesserae and Superpowers are development tools and are not runtime dependencies of Minerva.
