# Project AI document proposals implementation plan

Status: approved; Slices AI.6.1–AI.6.2 complete; Slice AI.6.3 next  
Date: 2026-07-31

## Preconditions

- Accept ADR 0023 and the audited AI.6 design.
- Keep AI.6 limited to create and active-draft update.
- Implement vertical slices with failing behavior tests first.
- Do not add provider proposal tools before the proposal persistence and atomic
  confirmation boundary exists.

## Slice AI.6.1: proposal contracts, lifecycle, and storage

Completed: 2026-07-31.

1. Add shared closed proposal kinds/statuses, safe projections, strict route
   contracts, TTL/size/page limits, and public stream proposal events.
2. Write pure tests for pending, reject, expire, stale, apply, replay, invalid
   transition, and payload-clearing decisions.
3. Add `project_ai_document_proposals` with owner/project/conversation/request
   scope, exact pending payload, expected revision, content hash, terminal safe
   receipt, timestamps, integrity checks, unique turn ownership, and cleanup
   indexes.
4. Add a bounded retry-safe cleanup service that clears expired payloads and
   later purges content-free receipts.
5. Add PostgreSQL tests for owner/project isolation, unique turn behavior, TTL,
   terminal payload clearing, and cleanup races.

Acceptance: an inert proposal can be stored, read by only its owner, rejected,
expired, and purged without any document mutation path.

## Slice AI.6.2: transaction-aware Documents primitives

Completed: 2026-07-31.

1. Add failing regression tests for all existing HTTP/MCP create and update
   behavior before refactoring.
2. Replace the create service's implicit template-only command with a
   discriminated template/content initial-source command while preserving
   existing boundary contracts.
3. Extract create/update transaction-aware persistence primitives reused by the
   existing public services.
4. Generalize mutation attribution to a validated `mcp | ai` discriminated
   union; keep all metadata content-free.
5. Add an atomic proposal confirmation service that locks owner-scoped proposal
   state, rechecks current permission and target/references, calls the shared
   primitive, and stores the terminal receipt in the same transaction.
6. Prove concurrent and duplicate create/update confirmations have one effect;
   prove conflict, removed permission, archived target/parent, invalid image,
   cross-user, and cross-project attempts have none.

Acceptance: confirmation is current, atomic, idempotent, and uses one Documents
business-rule path shared with Nitro and MCP.

## Slice AI.6.3: update proposal generation end to end

1. Add an explicit `answer | proposal` turn mode; ordinary mode continues to
   expose only read tools.
2. Add bounded `read_document_for_proposal` and
   `propose_document_update` definitions and executor behavior.
3. Extend provider parsing with separate strict proposal argument/buffer limits,
   one proposal per turn, and prompt-injection tests.
4. Validate exact Tiptap content, project resources, expected revision, and
   canonical hash before storing.
5. Attach only a safe proposal projection to completion events and conversation
   history joins.
6. Add the client API/action/store projection and a proposal card in the
   existing assistant message.
7. Add the titled responsive review Dialog, safe before/after renderer,
   reject action, final AlertDialog confirmation, stale/expired feedback, and
   success navigation.

Acceptance: an authorized user explicitly requests an update, receives an inert
proposal, reviews exact before/after content, and one confirmation updates the
expected draft once.

## Slice AI.6.4: create proposal end to end

1. Add the strict create proposal tool with parent, title, and validated content.
2. Recheck parent/project state during proposal creation and confirmation.
3. Reuse the content-source create primitive so page insertion, slug, position,
   search text, references, audit, proposal receipt, and document row commit
   atomically.
4. Extend review UI with parent/title/new-page presentation and resulting page
   navigation.
5. Add duplicate confirmation, removed create permission, deleted parent,
   invalid reference, slug collision, cancellation, and cross-project tests.

Acceptance: explicit confirmation creates one complete draft page; no partial
template page can exist.

## Slice AI.6.5: abuse, UX, and release verification

1. Add a real PostgreSQL workflow covering proposal generation fixture,
   review, update conflict, atomic update, atomic create, and replay.
2. Add provider-adapter abuse cases for document prompt injection, tool calls in
   answer mode, oversized arguments/content, mixed text/tool output, extra
   fields, unknown nodes/links/images, and multiple proposal calls.
3. Add browser journeys for desktop and mobile review, rejection, expiry,
   changed permission, stale revision, success link, and conversation reload.
4. Scan browser responses, audit events, logs, and generated indexes for
   proposal content/provider payload leakage.
5. Run focused and full unit/integration suites, Nuxt typecheck, production
   build, migration validation, and `git diff --check`.
6. Update product, architecture, roadmap, progress, and operational cleanup
   documentation only after the slice is accepted and verified.

Acceptance: create/update proposals fail closed across authorization, revision,
replay, prompt-injection, size, and lifecycle boundaries, and no document effect
occurs without the owner's explicit current confirmation.

## Deferred follow-ups

- large-document semantic patch language with stable node identities;
- archive, restore, move, publish, discard, and version-restore proposals;
- shared/team proposals;
- proposal search or long-term proposal history;
- autonomous or scheduled application.
