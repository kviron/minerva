# Project lifecycle threat and race model

Status: approved
Date: 2026-08-28
Approved: 2026-08-29

## Assets and trust boundaries

Protected assets are project existence, membership, roles and permissions,
documents and immutable versions, private images, credential ciphertext and
revealed plaintext, AI keys/conversations/proposals, public-share capabilities,
OAuth/MCP grants, lifecycle reasons and history, and audit integrity.

Trust boundaries are browser to Nitro, MCP client to OAuth/MCP, public
capability holder to the guest reader, application services to PostgreSQL/S3/AI
providers, and global administration to project-scoped authorization.

## Threats and required controls

### Enum-only lifecycle enforcement

Adding `paused` and `closed` while retaining scattered `active` or
`archived_at` checks would allow different modules to disagree. Every
project-bound use case uses one operation-aware server boundary. Architecture
tests enumerate allowed direct project-state query owners and reject new
feature-local authorization forks.

### Permission-only mutation after close

A user may retain a valid mutation permission while the project becomes
read-only. Authorization requires both the permission and an allowed operation
mode for the current lifecycle state. UI hiding is never sufficient.

### Transition versus in-flight mutation race

A mutation that checks `active` before a concurrent close could otherwise write
after close commits. All project mutations coordinate on the project row inside
their business transaction. Lifecycle updates use a conflicting lock. Real
PostgreSQL tests control both transactions and prove the commit ordering.

### Stale and ABA clients

State comparison alone misses `active -> paused -> active`. Every projection
and transition carries a monotonic lifecycle revision. A stale revision returns
a safe conflict and never applies the command.

### Duplicate transition through retry

Network retry, double submit, or proxy replay could apply an action twice or
duplicate effects. A client-generated UUID transition ID is unique per project.
The existing lifecycle event receipt is replayed only for the same project and
validated command identity; conflicting reuse is rejected.

### Unauthorized restore of an archived project

Ordinary project access is denied for archived projects, but restoration still
needs a narrow authorization path. Restore resolves the archived project under
row lock, then requires the exact `project.restore` permission on an active
membership or active global `super_admin`. It returns no ordinary project data
before authorization.

### Last administrator loss

Closing or archiving must not make a project permanently ownerless. The last
active Project Admin invariant remains across every state and account-disable,
membership-removal, and role-change path. Active global super administration is
the recovery boundary, not a role-name exception.

### Privilege escalation during migration

New permissions are backfilled only to built-in Admin roles. Custom roles,
Editor, and Viewer gain none automatically. New-project templates and migration
backfill are tested from the same expected permission sets. The existing
`documents.share` template mismatch is corrected before lifecycle rollout.

### Archived data exposure

Archived projects are absent from the switcher and ordinary project shell.
Authenticated content, credentials, images, search, AI, MCP, and public readers
all deny them with the existing neutral unavailable behavior. The archive list
uses a bounded projection sufficient only for identification and restoration.

### Public capability resurrection

Merely filtering archived projects could make old public links work again after
restore. Archive atomically revokes active capabilities; restore never clears
their revocation. Tokens, encrypted envelopes, and capability paths never enter
lifecycle history, audit metadata, logs, or errors.

### Cross-project OAuth/MCP revocation

OAuth grants are resource-wide. Revoking them on one project transition would
incorrectly remove access to other projects. The grant remains active; every
MCP project operation rechecks current project state, membership, scope, and
RBAC. Tests use one grant against active and non-active projects.

### AI continuation after freeze

An admitted provider stream may outlive a pause, close, or archive. The
transition invalidates database leases and pending proposals. New tool calls
and persistence recheck lifecycle revision/state. In-process cancellation is
best effort; no old proposal may become confirmable after resume/reopen.

### External effect inside database lock

Holding project locks during S3 or provider calls can block transitions and
create denial of service. External effects occur outside long database
transactions, followed by a locked attach/recheck. Failed attaches use bounded
compensation or established orphan cleanup.

### Sensitive reads in read-only projects

Credential reveal is deliberately allowed for authorized members in paused and
closed projects, but remains separately permission-checked, rate-limited,
audited, no-store, and plaintext-free in logs. Archive denies reveal. Lifecycle
status does not weaken category grants or Project Admin implicit access rules.

### Security action blocked by read-only policy

A blanket mutation denial could prevent revoking a leaked share or removing a
member. Only explicitly classified access-reducing commands bypass the ordinary
work-mutation gate. Mixed grant replacement, content archive, or configuration
updates remain denied.

### Lifecycle reason disclosure

Reasons may contain business-sensitive text. They are bounded and stored only
in project lifecycle history, returned only to authorized project history
readers, excluded from audit metadata, administration audit projection, logs,
analytics, MCP, public output, and Tesserae.

### Status probing and project enumeration

Missing, inaccessible, archived, and permission-denied projects remain
indistinguishable where the caller is not already authorized to know the
project. A member with project view may receive a safe `409` revision/state
conflict because existence and state are already visible to that member.

### Rollback incompatibility

Once `paused` or `closed` exists, an older application with the two-state
contract is unsafe. Deployment preflight verifies the required migration and
image compatibility. A fresh backup and forward-recovery path are required;
automatic destructive schema rollback is prohibited.

### Audit and history tampering

Current state, lifecycle history, transactional effects, and audit attribution
are written atomically. Lifecycle history is append-only through application
services. Ordinary users cannot update or delete it. Audit remains content-free
and is not used to reconstruct business state.

## Verification gates

- Every state/command and state/operation pair has an explicit test.
- Direct project-bound service authorization cannot bypass the shared boundary.
- A mutation cannot commit after a lifecycle transition that won the project
  lock; a mutation that won first completes before the transition.
- Stale revision and conflicting transition-ID reuse cannot change state.
- Custom roles gain no lifecycle permission during migration.
- The last active Project Admin survives every lifecycle/account/member race.
- Paused/closed web reads work while work mutations, AI, and MCP fail closed.
- Archived content and credentials are unavailable across every interface.
- One OAuth/MCP grant still works for another active project.
- Archived public links fail on the first post-commit request and remain
  revoked after restore/reopen.
- Pending AI proposal payloads clear and cannot be revived.
- Lifecycle reasons and capability/token/secret canaries are absent from logs,
  audit projections, errors, analytics, MCP, and public responses.
- Migration preflight rejects inconsistent historical archive metadata.
