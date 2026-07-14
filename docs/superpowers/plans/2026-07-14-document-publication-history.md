# Document publication, history, and restore plan

Date: 2026-07-14  
Status: approved in conversation

## Outcome

An authorized Editor can publish the current saved draft with an optional change summary, authorized members can inspect immutable version history, and an authorized Editor can copy a historical snapshot into a new draft revision without mutating history or changing the stable document slug.

## Rules

- Draft revision and published version number are separate monotonic counters.
- Publishing snapshots only the currently persisted draft and requires its expected revision.
- Published snapshots are immutable through ordinary application flows.
- Version numbers are allocated per document inside the publication transaction.
- Restore copies snapshot title and content into the current draft, increments the draft revision atomically, and preserves the current slug.
- Publish requires `documents.publish`; history requires `documents.view_history`; restore requires both `documents.view_history` and `documents.update_draft`.
- Missing resources and denied access return the same safe not-found result.
- Audit metadata contains identifiers, version/revision numbers, and summary length, never document content.

## TDD slices

1. Add schema and migration coverage for immutable document versions.
2. Add pure validation and transactional publish/history/restore services with authorization tests.
3. Add strict Nitro boundaries and shared contracts.
4. Add stateless client actions, Pinia projections, and explicit result application.
5. Add a publish Dialog and version-history Sheet with preview and restore confirmation.
6. Run focused PostgreSQL integration tests, full unit tests, typecheck, and production build.
