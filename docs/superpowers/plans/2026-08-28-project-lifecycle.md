# Project lifecycle implementation plan

Status: approved for implementation
Date: 2026-08-28
Approved: 2026-08-29

## Preconditions

- The audited project lifecycle design, threat/race model, and ADR 0028 were
  approved on 2026-08-29.
- Amend canonical product, architecture, roadmap, and affected accepted ADRs
  only after approval and before application implementation.
- Implement vertical slices tests first.
- Keep authorization server-side and based on exact permission codes plus the
  project operation policy, never UI visibility or role names.
- Update `docs/progress.md` after every completed slice and run
  `./scripts/refresh-tesserae.ps1` after canonical documentation or application
  changes.
- Do not add project lifecycle mutation tools to MCP.

## Slice PL.0: canonical adoption and permission-template correction

Progress: completed 2026-08-29. The focused PostgreSQL creation assertion is
present but its local run awaits an available Docker daemon/test database.

1. Mark ADR 0028, design, threat model, and this plan approved with the approval
   date; update product spec, architecture, roadmap, and affected ADR 0024/AI/MCP
   wording with the accepted state and channel matrix.
2. Add a failing regression test proving new-project role templates match ADR
   0024 and migration 0020: `documents.share` belongs to Admin and Editor, not
   Viewer.
3. Correct the built-in template without altering existing migrated roles.
4. Add an architecture test over the real MCP tool registry that prohibits
   lifecycle mutation registration. The pure operation modes are enumerated in
   PL.1; enforcement that every project-bound module uses the new boundary is
   added with the PL.3 migration, after that boundary exists.

Acceptance: canonical sources agree, new projects receive the approved public-
share defaults, and lifecycle application work is unblocked.

## Slice PL.1: pure lifecycle and operation policies

Progress: completed 2026-08-29.

1. Add failing table-driven tests for all project state/transition pairs,
   available transitions, and every project state/operation-mode pair.
2. Expand the shared closed state and permission vocabularies and derive types
   without assertions or non-null escapes.
3. Add strict request/response/history contracts for transition, revision,
   transition ID, reason, safe conflict, and list status filter.
4. Implement pure project transition and operation policy functions with
   discriminated apply/replay/reject outcomes and no effects.
5. Prove unknown external states, transitions, modes, revisions, IDs, reasons,
   and extra fields fail validation.

Acceptance: every lifecycle decision is deterministic, exhaustively tested,
and independent of database, authorization, Nitro, MCP, and Vue.

## Slice PL.2: persistence, migration, and transition service

1. Add failing schema/migration tests for lifecycle revision, status-change
   attribution, archive consistency, immutable history, unique revisions,
   transition replay keys, reason bounds, and expanded permission constraints.
2. Add a preflight test/query that rejects inconsistent legacy archived rows.
3. Generate and review one additive Drizzle migration. Backfill new lifecycle
   permissions only to existing built-in Admin roles and backfill lifecycle
   metadata without promoting custom roles.
4. Add PostgreSQL integration tests before implementing the service: all valid
   transitions, neutral denial, super-admin bypass, last-admin preservation,
   stale revision, same-command replay, conflicting transition-ID reuse, and
   atomic history/audit.
5. Implement the transaction service with narrow clock/persistence
   capabilities, project row lock, pure decision call, revision increment,
   lifecycle event, and content-free audit.
6. Add the strict private/no-store Nitro endpoint and safe HTTP mapping.

Acceptance: one authorized transition changes current state, history, effects,
and audit atomically; stale, duplicate, inaccessible, and illegal commands
cannot change state.

## Slice PL.3: unified project operation access and read-only core

1. Add failing operation-matrix integration tests for Project overview/settings,
   Documents/tree/history/search, private images, and Credentials/category
   list/search/reveal across all four states.
2. Replace the boolean active-only helper with a bounded operation-aware access
   projection supporting exact permission and global super-admin bypass.
3. Route existing Project, Documents, Search, Files, and Credentials read paths
   through the shared boundary and remove feature-local lifecycle decisions.
4. Route every work mutation through a same-transaction project state check.
   Prove paused/closed mutations fail neutrally while reads remain available and
   archive denies both.
5. Add controlled two-transaction PostgreSQL tests proving lifecycle versus
   mutation lock ordering, including a credential mutation and a document
   mutation that previously used different access paths.
6. Define and test the external-object attach/recheck/cleanup path for icon and
   image upload without holding a network call inside a project lock.

Acceptance: project state and RBAC produce identical decisions in every core
HTTP application service, and no mutation commits on the wrong side of a
winning lifecycle transition.

## Slice PL.4: public sharing, AI, OAuth/MCP, and privacy boundaries

1. Add failing tests for public reads in active/paused/closed, atomic revocation
   on archive, immediate unavailable responses, and no resurrection after
   restore/reopen.
2. Add failing AI tests for active-only availability/history/turns/proposals,
   stale payload clearing, lease release, persistence recheck, disabled
   connection on archive, and no automatic re-enable.
3. Add failing MCP integration tests for active-only read/mutation, first
   post-transition denial, and the same resource-wide OAuth grant continuing to
   serve another active project.
4. Implement transition side effects in the project transaction and route
   Public Sharing, AI, and MCP service calls through the project operation
   boundary. Do not revoke global OAuth grants.
5. Add profile/contact visibility tests so paused/closed/archived projects do
   not sustain shared-project contact disclosure.
6. Prove lifecycle reasons, capability tokens, OAuth tokens, AI keys/content,
   credential values, and storage paths never enter audit, logs, analytics,
   errors, public responses, or MCP.

Acceptance: every external and sensitive boundary observes the committed
project state without cross-project revocation or data leakage.

## Slice PL.5: project lists, archive surface, Actions, and read-only UX

1. Add failing client and API tests for server-side cursor-compatible status
   filtering and Russian/English status labels.
2. Add `ProjectsActions.transitionLifecycle` and API adapters using the existing
   BaseActions pending/error/concurrency mechanics. Keep project state in the
   project store and apply only validated server responses.
3. Add lifecycle revision and server-derived available transitions to member
   overview and bounded archive projections.
4. Add active/paused/closed/archive list tabs, status badges, project banners,
   read-only controls, transition confirmations, bounded reason input, and
   project-name archive confirmation using installed shadcn-vue primitives.
5. Exclude archived projects from the switcher. Route archived list rows to an
   archive summary/restore surface rather than the ordinary Project Shell.
6. Add lifecycle history to Project Settings for authorized users without
   exposing reason text in global administration audit.
7. Verify keyboard, mobile, loading, empty, stale-conflict, replay, and error
   behavior.

Acceptance: an authorized administrator can pause, resume, close, reopen,
archive, and restore through explicit localized UX; other users receive the
correct read-only or unavailable experience.

## Slice PL.6: end-to-end and release verification

1. Add PostgreSQL-backed Playwright journeys covering the complete lifecycle,
   multiple roles, stale concurrent administrators, archived restore, and no
   public-link resurrection.
2. Run the full permission/channel matrix across authenticated HTTP, public
   documentation, AI, MCP, credentials reveal, search, and images.
3. Run frozen install, all unit/integration/E2E suites, Nuxt typecheck,
   production build, Drizzle validation, migration twice, and `git diff --check`.
4. Apply the migration to a production-shaped restored dataset and prove the
   new image cannot be rolled back to a two-state image after new states exist.
5. Update operations/release checks, product spec, architecture, roadmap,
   progress, and accepted ADR cross-references with final verified behavior.
6. Refresh Tesserae through the repository wrapper and exclude generated
   indexes/session material from commit.

Acceptance: the first request after each committed transition observes the new
state across every boundary, a clean production-shaped migration succeeds, and
all release checks pass.

## Deferred follow-ups

- physical project deletion and bounded retention;
- scheduled transitions;
- billing or security suspension as an orthogonal operational state;
- MCP lifecycle administration;
- bulk lifecycle changes;
- retrofitting existing entity lifecycles onto a universal framework.
