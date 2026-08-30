# Project lifecycle: audited design

Status: approved
Date: 2026-08-28
Approved: 2026-08-29

## Goal

Give Minerva projects an explicit, recoverable lifecycle with `active`,
`paused`, `closed`, and `archived` states while keeping authorization,
concurrent mutations, HTTP, MCP, AI, public sharing, credentials, documents,
files, search, audit, and client behavior consistent.

The design also establishes a reusable lifecycle pattern for future entities.
It does not force unrelated entities into one inheritance hierarchy or one
storage model.

## Audited baseline

The repository currently has lifecycle scaffolding rather than a completed
project lifecycle:

- `PROJECT_STATUS` contains only `active` and `archived`;
- `projects` stores `status`, `archived_at`, and `archived_by_user_id`;
- `project.archive` and `project.restore` permission codes exist;
- member and administration lists expose the status and the client filters it;
- no project archive/restore application service or HTTP endpoint exists.

Project-state enforcement is fragmented. The shared project access helper and
AI authorization require `active`; public documentation also queries an active
project; some document mutations test only `archived_at`; credentials and
several document readers resolve active membership and permission without
joining project state; overview and list projections can return archived
projects. Adding new enum values without first introducing one operation-aware
server boundary would therefore permit inconsistent access and mutations.

The audit also found a pre-existing template mismatch: ADR 0024 and migration
0020 grant `documents.share` to built-in Admin and Editor, but the current
creation template grants it to Admin and Viewer. This must be corrected and
covered before lifecycle permission backfill.

## Terminology

- **Lifecycle state** is the current business phase of a project.
- **Lifecycle transition** is a semantic command such as `close`, not an
  unrestricted assignment of `status`.
- **Operation mode** describes how a use case interacts with project data:
  authenticated read, work mutation, security reduction, MCP read/mutation,
  public read, or lifecycle transition.
- **Lifecycle revision** increments on every accepted transition and protects
  clients from stale and ABA state changes.
- **Lifecycle event** is an immutable business-history row. Audit remains a
  separate security and attribution record and is not the state source.

An active membership remains independent of project lifecycle. Pausing,
closing, or archiving a project does not remove its memberships.

## State model

The closed state set is:

| State | Meaning |
|---|---|
| `active` | Ordinary project work is in progress. |
| `paused` | Work is temporarily frozen and may be resumed. |
| `closed` | Work is complete and retained as a read-only record. |
| `archived` | The project is removed from ordinary workspaces and ordinary access. |

New projects start as `active`. `closed` and `archived` are not deletion.
Physical project deletion remains outside the first lifecycle release.

Allowed transitions are:

| Command | From | To | Permission |
|---|---|---|---|
| `pause` | `active` | `paused` | `project.pause` |
| `resume` | `paused` | `active` | `project.resume` |
| `close` | `active`, `paused` | `closed` | `project.close` |
| `reopen` | `closed` | `active` | `project.reopen` |
| `archive` | `closed` | `archived` | existing `project.archive` |
| `restore` | `archived` | `closed` | existing `project.restore` |

There is no direct `active -> archived` transition. Restoring never silently
resumes work. Reopening and restoring are distinct audited decisions.

Every transition accepts a bounded optional reason. The UI may require a reason
for `close` and `archive`, but the server contract uses one consistent bounded
field so policy can tighten without schema churn.

## Reusable lifecycle pattern

Do not introduce `LifecycleEntity`, ORM model inheritance, or a universal
effectful `LifecycleService`. Minerva already has state machines with materially
different semantics: document publication plus archival, public-share replay,
AI proposal expiry and terminal receipts, conversation trash retention, and AI
turn leases.

Reuse is structural and compositional:

1. closed `as const` state and command vocabularies with derived unions;
2. a pure deterministic decision function;
3. a discriminated apply/replay/reject result;
4. an entity-specific application service for authorization, persistence,
   effects, and audit;
5. entity-specific shared request/response validation;
6. client Actions only for transport, pending/error state, and concurrency.

A tiny shared lifecycle decision type may be extracted if it makes the Project,
public-share, and AI-proposal decisions clearer without changing their domain
outputs. The project slice must not pre-emptively rewrite existing lifecycles
merely to demonstrate reuse.

The project policy exposes pure functions such as:

```text
decideProjectLifecycleTransition(currentState, command)
availableProjectLifecycleTransitions(currentState)
projectStateAllowsOperation(state, operationMode)
```

They contain no database, session, permission lookup, clock, network, Vue, or
Nitro dependency. Entity facts required by an invariant are passed explicitly.

## Project operation policy

Permission codes still decide what a user may do. Lifecycle state additionally
decides whether that kind of operation is currently admitted. Neither UI
visibility nor localized role names authorize anything.

The initial matrix is:

| Operation | `active` | `paused` | `closed` | `archived` |
|---|---:|---:|---:|---:|
| Authenticated web/API read | allow | allow | allow | deny |
| Document/search/image read | allow | allow | allow | deny |
| Credential list/reveal for an authorized member | allow | allow | allow | deny |
| Work/content/configuration mutation | allow | deny | deny | deny |
| Access-reducing security action | allow | allow | allow | system/restore boundary only |
| AI connection use, history, turns, or proposals | allow | deny | deny | deny |
| MCP documentation read or mutation | RBAC and scope | deny | deny | deny |
| Public read of an existing capability | allow | allow | allow | deny |
| Create/copy/rotate a public capability | allow | deny | deny | deny |
| Revoke a public capability | allow | allow | allow | handled by archive transition |

Access-reducing actions are deliberately narrow: revoke a public share, remove
a member while retaining the last-admin invariant, cancel an invitation,
disconnect the AI provider, reject a private proposal, or perform another
approved privacy/security reduction. A mixed replace operation that could add
and remove grants is not automatically a security reduction.

`paused` and `closed` currently share the same read-only data policy but express
different business meaning and transitions. Future retention or reporting may
distinguish them without changing historical meaning.

The AI and MCP restrictions preserve accepted ADRs requiring an active project.
An OAuth/MCP grant is resource-wide, not project-bound. Pausing, closing, or
archiving one project must not revoke a grant that may still authorize the same
user in another active project; each project operation fails at the project
boundary instead.

Public links remain readable while a project is paused or closed. Archiving
atomically revokes every active public share so restoration cannot unexpectedly
republish material. Restored projects remain closed and require newly created
links for future public access. This is a deliberate amendment to ADR 0024's
first-release rule that links otherwise remain active until explicit
revocation.

Shared-profile contacts marked visible to shared projects are visible only
when both users retain active memberships in at least one `active` project.
Paused, closed, and archived projects do not sustain that privacy relationship.

## Server authorization boundary

Replace fragmented status checks with one server-only project operation access
boundary. It resolves:

- active account or active `super_admin`;
- project and lifecycle state;
- active membership and exact role permissions, unless global super-admin
  bypass applies;
- requested operation mode;
- safe not-found behavior.

Every project-bound Documents, Credentials, Files, Search, Public Sharing, AI,
and MCP use case calls this boundary. The evaluator returns a bounded access
projection or a denial, never database rows or secrets.

Project lifecycle transitions remain owned by Projects. They are available to
an active project member with the exact transition permission or an active
`super_admin` under the existing global bypass. Project Admin remains a role
template, not an authorization string check.

Lifecycle transitions are not exposed through MCP. Adding high-risk MCP
administration remains prohibited without a separate accepted ADR and explicit
user approval.

## Persistence and business history

The `projects` current-state record adds:

```text
lifecycle_revision integer not null default 0
status_changed_at timestamptz not null
status_changed_by_user_id uuid not null
```

Existing `status`, `archived_at`, and `archived_by_user_id` remain. A database
check requires both archive fields exactly when `status = 'archived'`, and
requires both to be null otherwise. `lifecycle_revision` is non-negative.

An append-only `project_lifecycle_events` table stores:

```text
id uuid primary key
project_id uuid
transition text
previous_state text
next_state text
revision integer
reason text null
actor_user_id uuid
channel text
transition_id uuid
created_at timestamptz
```

Constraints enforce closed vocabularies, trimmed bounded reasons, positive
revisions, unique `(project_id, revision)`, and unique `(project_id,
transition_id)`. The latter makes a retried command replay its existing safe
receipt instead of applying twice.

The project row is the source of current state. Lifecycle events provide
business history. `audit_events` receives a separate content-free event with
state codes and revision but not the free-text reason. The safe administration
audit projection is extended only with an allow-listed numeric
`lifecycleRevision` detail if needed.

Creation writes lifecycle revision zero but does not synthesize a transition
event. The existing `project.created` audit event remains creation evidence.

## Concurrency and atomicity

The transition command carries `expectedRevision` and `transitionId`. A
transaction:

1. locks the project row for update;
2. checks account, membership/super-admin authority, and exact permission;
3. replays an existing matching transition ID when present;
4. rejects a stale expected revision with a safe conflict;
5. evaluates the pure transition decision;
6. applies project state, revision, timestamps, and transactional side effects;
7. inserts lifecycle history and content-free audit;
8. commits one result.

`expectedState` alone is insufficient because `active -> paused -> active`
would make a stale client appear current.

Every project-bound mutation must serialize with lifecycle transitions. Read
operations need no row lock. Work mutations acquire a consistent project row
lock inside the same transaction as their permission/state check and business
write. The implementation may use a shared row lock compatible among ordinary
mutations but conflicting with lifecycle updates; the exact PostgreSQL mode is
proved by concurrency integration tests rather than assumed.

No external provider or S3 network call occurs while holding a long database
transaction. External workflows validate, perform the bounded external effect,
then lock and recheck project state before attaching the result; failed attach
performs safe compensation or leaves only an existing cleanup-eligible orphan.

The first request started after a lifecycle transition commits observes the new
state. A request that already acquired the project mutation lock may complete
before the transition. Tests make this ordering explicit.

## Transition effects

### Pause and close

- deny new work mutations, AI access, and MCP operations;
- terminalize pending AI document proposals as `stale` and clear payloads;
- release or invalidate active AI leases in PostgreSQL;
- preserve documents, versions, images, credentials, categories, roles,
  memberships, conversations, audit, and public shares;
- prevent an old proposal from becoming confirmable after resume/reopen.

In-process streaming cancellation is best effort. No new provider/tool work is
admitted after commit, and persistence after a provider response rechecks the
project boundary.

### Archive

- require the project to be closed;
- revoke active public document shares in the same database transaction;
- disable the AI connection without deleting its encrypted key;
- stale pending AI proposals and release leases;
- hide the project from ordinary lists, project switcher, search, icons,
  documents, credentials, AI, public reads, and MCP operations;
- retain memberships, roles, content, ciphertext, versions, objects, history,
  and audit for recovery.

Archive does not revoke global OAuth/MCP grants and does not physically delete
project data or objects.

### Restore

- move only `archived -> closed`;
- clear archive fields;
- keep AI disabled;
- keep old public shares revoked;
- keep old AI proposals terminal;
- expose the project again as authenticated read-only.

Reopening to active is a separate permission, command, revision, reason, and
audit event.

## Last-admin and global administration invariants

The last active Project Admin cannot be removed, demoted, or disabled in any
project lifecycle state. Archived projects retain memberships so an authorized
administrator can restore them. If every project administrator becomes
inactive through an external account event, an active `super_admin` can use the
global bypass to restore and repair membership without impersonating a project
role.

Migration grants new lifecycle permissions to every existing built-in Admin
role and to no custom role. New project templates must match that backfill.

## HTTP contracts and safe errors

Use one semantic endpoint:

```text
POST /api/projects/:id/lifecycle-transitions
```

The strict request contains `transition`, `expectedRevision`, `transitionId`,
and optional bounded `reason`. The response contains previous/current state,
new revision, transition ID, changed time, and currently available transitions.

Malformed input is `400`. Missing/inaccessible project or permission is the
same neutral `404` where project existence must stay hidden. A stale revision or
invalid current transition is `409` with a safe machine code. Unexpected
infrastructure failure is content-free `500` and never returns reason text,
SQL, stack, tokens, or content.

The endpoint is session-bound, private/no-store, and never accepts a lifecycle
state directly.

## Client architecture and UX

`ProjectsActions` receives one `transitionLifecycle` async action. It uses the
existing `BaseActions` pending/error/concurrency behavior and calls the project
API adapter; it does not calculate authorization or state transitions.

Do not add a second `LifecycleActions` superclass. TypeScript classes cannot
compose multiple base responsibilities cleanly, and entity Actions already own
their feature transport.

The project projection includes lifecycle revision and server-derived available
transitions. UI uses them for composition only. Required UX:

- localized status badge and persistent paused/closed banner;
- read-only controls on paused and closed routes;
- lifecycle card in Project Settings with history and explicit confirmation;
- project-name confirmation for archive;
- member list tabs for Active, Paused, Closed, and Archive;
- server-side status filtering compatible with cursor pagination;
- project switcher containing active, paused, and closed projects but not
  archived projects;
- archived rows opening a bounded archive summary/restore surface rather than
  the ordinary Project Shell;
- Russian default copy and English secondary copy.

Server responses remain authoritative when client state is stale.

## Verification strategy

Tests first cover:

- every allowed and rejected state/command pair;
- every lifecycle state/operation-mode pair;
- strict contracts and unknown state/command rejection;
- schema constraints, migration backfill, built-in templates, and custom-role
  non-escalation;
- revision conflicts, transition-ID replay, and concurrent transition/mutation
  ordering in real PostgreSQL;
- last-admin and super-admin recovery behavior;
- Documents, Search, Files, Credentials/reveal, Public Sharing, AI, and MCP
  behavior in all four states;
- a global OAuth/MCP grant continuing to work for another active project;
- public links failing immediately after archive and never resurrecting on
  restore;
- pending proposal invalidation and disabled AI connection restoration;
- server-side paginated filters, switcher exclusion, banners, read-only UI,
  confirmations, and archived restore UX;
- neutral errors, logs, audit metadata, and absence of reason/content leakage;
- production build and full browser journeys.

## Rollout and compatibility

The migration is additive except for replacing the existing project status
check with the expanded closed set. Existing projects remain `active` with
revision zero and creator attribution as their initial lifecycle actor. Existing
archived rows, if any, must pass a preflight consistency query; inconsistent
archive metadata blocks migration and requires explicit repair.

Application rollout occurs only after the new schema is present. A prior image
that rejects `paused` or `closed` cannot be used for rollback after either state
has been written. Release documentation therefore treats the lifecycle
migration as forward-only at the application-contract level and requires a
fresh backup plus forward-recovery instructions.

## Deferred

- scheduled or automatic transitions;
- physical project deletion and retention expiry;
- billing-driven suspension;
- a separate security/operational project block state;
- lifecycle mutation tools in MCP;
- bulk lifecycle changes;
- generic visual workflow builders;
- retrofitting all existing resource lifecycles onto one framework.

## Approval decisions

Approval accepts:

1. `active`, `paused`, `closed`, and `archived` as the complete first project
   lifecycle state set;
2. the explicit transition graph and six stable permission codes;
3. web read-only access to paused/closed projects, with AI and MCP disabled;
4. credential reveal remaining available to an otherwise authorized member in
   paused/closed projects;
5. public links remaining available while paused/closed and being permanently
   revoked on archive;
6. restore to `closed`, never directly to `active`;
7. lifecycle revision, idempotent transition IDs, immutable business history,
   and content-free audit separation;
8. one server operation-aware project access boundary used by every project
   feature;
9. composition and pure decisions instead of entity inheritance;
10. implementation in the vertical slices of the accompanying plan.
