# Project AI Assistant implementation plan

Status: approved; Slices AI.1–AI.5 complete; AI.6 has an approved separate design and plan  
Date: 2026-07-15

## Slice AI.1: canonical boundary and permissions

Completed: 2026-07-16.

1. Accept the assistant design and record an ADR for dedicated encrypted AI connections, user-bound execution, and proposal-only mutations.
2. Add the assistant boundary to product spec, architecture, roadmap, and backlog.
3. Add stable `project.ai.use` and `project.ai.manage` permission codes and built-in-role defaults through an additive migration.
4. Test role defaults, custom-role matrices, inactive membership, archived project, and server-side denial.

Acceptance: permission decisions are stable, server-owned, and independent of localized role names.

## Slice AI.2: encrypted provider connections

Completed: 2026-07-16.

1. Add `project_ai_connections` with one active connection per project, provider/model validation, encrypted secret fields, safe limits, and attribution.
2. Reuse the versioned encryption primitive with AI-specific associated data; never route keys through the Credentials module.
3. Add Project Admin application services and thin no-store Nitro endpoints for safe read, create/replace, test, and disconnect.
4. Add a project settings Card composed from existing shadcn-vue Field, Select, Input, Switch, Alert, Badge, and confirmation components.
5. Test ciphertext-at-rest, wrong-key failure, safe projections, permission revocation, replacement, disconnect, audit redaction, and provider-test timeout.

Acceptance: an Admin configures and validates a connection while no API response, log, error, audit row, or client state contains the raw key.

## Slice AI.3: provider-neutral read-only orchestration

Completed: 2026-07-29.

The first two vertical increments provide strict non-streaming
and SSE turn boundaries: current-user authorization, one bounded
authorization-aware document search, OpenAI Responses adapters behind
provider-neutral ports, structured answers, verified retrieved-context citations,
streamed text deltas, cancellation propagation, deadlines, bounded provider
event/output buffers, and authorization rechecks before streamed output.
The third increment adds cross-instance PostgreSQL admission: one active leased
turn per project/user, ten starts per five-minute fixed window, matching-lease
release, content-free usage events, and transactional audit for both JSON and
SSE boundaries. The final increment adds four strict read-only documentation
tools, server-closed project/user context, current-RBAC checks on every tool,
three sequential Responses tool rounds, 8,000-character tool-result bounds,
tool-loop rejection, accumulated usage, verified citations, and content-free
tool/document audit attribution.

1. Define a provider-neutral streaming chat port with discriminated provider outcomes and injected clock/request/network capabilities.
2. Implement one OpenAI-compatible adapter with strict request/response validation, cancellation, deadline, token limit, and redacted failures.
3. Add read-only assistant tools backed by existing document search/tree/read/version application services; close project/user context over each tool.
4. Treat retrieved documentation as untrusted content, cap tool rounds and context bytes, and require stable document citations.
5. Add per-user/project rate limits, concurrency guard, usage events, and content-free audit.
6. Test prompt injection, cross-project calls, RBAC changes during a turn, malformed provider streams, cancellation, timeout, tool loops, context limits, and secret/content redaction.

Acceptance: the service returns a grounded, cited answer without any mutation capability or authorization bypass.

## Slice AI.4: project-wide assistant widget

Completed: 2026-07-29.

One layout-level assistant provider now surrounds the routed project pages, while
the permission-aware trigger is mounted by `ProjectShell`. The in-memory Pinia
projection therefore survives route changes inside one project and resets while
cancelling the active request when the project identity changes. A strict fetch
SSE boundary validates every shared-contract event, framing, content type, and
terminal outcome without reflecting malformed payloads. Stateless feature
actions remain independent from Pinia under ADR 0013; `BaseActions` owns request
cancellation and the widget explicitly applies validated events to immutable
store transitions. The responsive titled Sheet composes `MessageScroller`,
Empty, Alert, Badge, Skeleton, Spinner, and InputGroup primitives, renders plain
text without `v-html`, links verified citations back to Minerva documents, and
supports focus-on-open, Enter/Shift+Enter, cancel, retry, and new-conversation
flows. Conversation persistence remains outside this slice.

1. Mount one assistant provider and trigger in `ProjectShell` so state survives project route changes and resets on project change.
2. Compose a titled Sheet with the installed `MessageScroller`, Empty, Alert, Badge, Skeleton, Spinner, InputGroup textarea, and Buttons.
3. Add stateless feature-scoped actions for open/new conversation/send/cancel/retry and an immutable Pinia projection for the active turn.
4. Stream assistant events through a strict client boundary; render plain validated content and Minerva citations without `v-html`.
5. Cover keyboard/focus behavior, responsive overlay, scroll anchoring, cancellation, navigation, project switching, loading, empty, error, and permission states.

Acceptance: an authorized member asks from every project page, watches a cancellable streamed answer, follows citations, and never carries context across projects.

## Slice AI.5: persistent conversations

This slice requires separate approval of retention and deletion behavior.

1. Add project/user-scoped conversations and messages with explicit timestamps and recoverable conversation deletion.
2. Store only user/assistant-visible messages, not hidden system prompts, provider payloads, or raw tool results.
3. Add paginated history and preserve `MessageScroller` position when prepending older turns.
4. Add retention controls and user-visible deletion.

Acceptance: history is authorized, bounded, deletable, and cannot leak between users or projects.

## Slice AI.6: proposed documentation changes

This slice remains blocked until AI.1–AI.4 security evidence is reviewed.

1. Add proposal-only create/update operations; the model cannot call document mutation services directly.
2. Persist or sign a short-lived proposal containing project/document IDs, expected revision, validated content, and request ID.
3. Render exact before/after diff in a titled review overlay and require explicit user confirmation.
4. On confirmation, recheck current RBAC and revision, then call the existing shared document application service with idempotency and AI attribution.
5. Add create, update, conflict, cancellation, stale proposal, changed permissions, prompt-injection, duplicate confirmation, and content-free audit tests.

Archive, restore, and publish remain separate later increments with distinct confirmations.

Acceptance: the assistant can suggest a documentation change, but only the authorized user's confirmed, current, idempotent application-service command changes data.

## Verification gate

For every completed vertical slice:

- focused tests first, then full unit and PostgreSQL integration suites;
- Nuxt typecheck and production build;
- Drizzle migration validation for schema changes;
- browser journey for settings/widget behavior when UI is introduced;
- redaction audit for keys, prompts, provider payloads, document text, and storage paths;
- update `docs/progress.md` and refresh Tesserae.
