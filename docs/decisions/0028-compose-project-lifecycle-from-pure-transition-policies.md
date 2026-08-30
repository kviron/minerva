# ADR 0028: Compose project lifecycle from pure transition and operation policies

Date: 2026-08-28
Status: accepted
Accepted: 2026-08-29

## Context

Minerva declares project lifecycle ownership in Projects and already stores an
`active | archived` project status, archive metadata, and archive/restore
permissions. It does not yet implement project lifecycle transitions.

The application now has many project-bound boundaries: authenticated pages and
APIs, Documents, Search, Files, encrypted Credentials, public documentation,
AI conversations/proposals/provider connections, OAuth/MCP, lists, navigation,
and audit. Their current project-state checks are not centralized. Some require
`active`, some test only `archived_at`, and some resolve only active membership
and permission.

A reusable lifecycle abstraction is desirable, but existing Minerva lifecycles
are not interchangeable. Documents combine publication and archival; public
shares support replay and revocation; AI proposals expire and retain bounded
receipts; AI turns use leases. Entity inheritance or one effectful generic
service would erase these differences and couple domain records to persistence
or client infrastructure.

## Decision

- Project lifecycle states are `active`, `paused`, `closed`, and `archived`.
- Transitions are semantic commands: `pause`, `resume`, `close`, `reopen`,
  `archive`, and `restore`. Direct status assignment is not an application API.
- `active <-> paused`, `active|paused -> closed`, `closed -> active`,
  `closed -> archived`, and `archived -> closed` are the only transitions.
- Each transition has its own stable project permission code. Existing
  `project.archive` and `project.restore` remain; pause/resume/close/reopen are
  added. Built-in Admin receives all; custom roles, Editor, and Viewer receive
  none automatically.
- Lifecycle reuse uses composition: closed constants and derived types, pure
  entity-specific decision functions, discriminated results, narrow injected
  effects, and entity-specific application services. Business entities do not
  inherit from a lifecycle base class.
- A server-only project operation access boundary combines active account,
  global super-admin bypass, active membership, exact permission code, project
  lifecycle state, and operation mode. Every project-bound module uses it.
- Authenticated web/API reads and authorized credential reveal remain available
  in paused and closed projects. Work mutations are active-only. Explicit
  access-reducing security operations remain available while paused/closed.
- AI and MCP project operations are active-only. Project transitions do not
  revoke resource-wide OAuth/MCP grants; the project operation is denied at
  execution time.
- Existing public shares remain readable while paused/closed. Archive
  atomically revokes active shares, and restore never resurrects them.
- Archived projects deny ordinary reads and appear only through a bounded
  archive/restore projection. Restore returns to closed; reopening is separate.
- Each project stores a monotonic lifecycle revision and consistent status
  metadata. Each transition writes immutable project lifecycle history and a
  separate content-free audit event in the same transaction.
- A caller-provided transition UUID makes retries replay-safe. Expected
  lifecycle revision protects against stale and ABA clients.
- All project-bound mutations coordinate transactionally with lifecycle
  transitions through a proven project-row locking protocol. External S3 or AI
  calls are never held inside long project-lock transactions and recheck state
  before attaching results.
- Project lifecycle administration is not exposed through MCP.

## Consequences

- Lifecycle behavior is consistent across web, API, MCP, AI, public sharing,
  documents, credentials, files, and search.
- Paused and closed projects are useful read-only records without making
  archived data broadly accessible.
- Authorization services require a cross-cutting refactor before adding the new
  states; adding enum values first is unsafe.
- Lifecycle revision/history and transition idempotency add schema and service
  complexity but make retries and concurrent administration deterministic.
- Public links are permanently revoked by archive, amending ADR 0024's ordinary
  explicit-revocation lifetime for this project-level security event.
- A prior application image cannot safely run after paused/closed rows exist;
  rollout requires migration compatibility and forward recovery.
- Existing resource lifecycles remain entity-specific. Common machinery is
  extracted only when it clarifies, rather than forcing, their decisions.

## Alternatives rejected

- **Entity inheritance from `LifecycleEntity`:** couples plain domain data to
  behavior/storage and cannot represent orthogonal or time-based lifecycles.
- **One generic effectful `LifecycleService`:** hides authorization, locking,
  side effects, history, and error differences behind callbacks.
- **A single `setStatus` permission and endpoint:** permits illegal jumps and
  loses semantic authorization, confirmation, effects, and audit actions.
- **Permission checks without operation modes:** cannot distinguish creating a
  public share from revoking one or AI reading from proposal mutation.
- **UI-only read-only controls:** stale clients, HTTP, and MCP would still
  mutate data.
- **State comparison without revision:** fails after an ABA transition.
- **Revoke OAuth grants on archive:** a resource-wide grant may remain valid for
  other active projects.
- **Restore directly to active:** silently resumes work and integrations without
  a separate deliberate authorization event.
