# ADR 0018: Use leased idempotency records for MCP mutations

Date: 2026-07-15  
Status: Accepted

## Context

Remote MCP clients may retry a mutation after a timeout without knowing whether Minerva completed it. A key scoped only to a user or tool could collide across OAuth grants or projects, while an unbounded record would retain delegated-operation metadata indefinitely. A crashed worker must not reserve a key forever, but reclaiming abandoned work must not let the old worker overwrite the new result or bypass document revision checks.

## Decision

- Scope every MCP mutation key by OAuth grant, exact tool name, project, and client-provided idempotency key.
- Hash canonical validated input with SHA-256 and reject reuse of the same scoped key with a different hash.
- Store only a JSON-safe terminal response intended for replay; never store tokens, document bodies, uploaded bytes, credentials, or raw storage paths as an idempotency result.
- Serialize acquisition of one exact scope with a PostgreSQL advisory transaction lock and verify the OAuth grant is active under a database row lock before acquisition or replay.
- Give in-progress work an opaque lease token. A reclaimed lease replaces that token, and completion succeeds only for the current unexpired token.
- Retain records for one day by default and never more than seven days. Opportunistic cleanup deletes expired rows in bounded `FOR UPDATE SKIP LOCKED` batches.
- Treat a lease as coordination, not permission to bypass domain concurrency. Every reclaimed document mutation must still use the existing transaction and optimistic draft revision or equivalent domain invariant.

## Consequences

- Identical completed retries return the same safe result without repeating the domain operation.
- Concurrent identical requests have one executor while the lease is live; other callers receive a retryable busy outcome.
- Keys cannot cross grants, projects, or tools, and a revoked grant cannot replay a previously stored result.
- A worker that resumes after losing its lease cannot publish a terminal result. Its domain attempt must still fail safely through the document service's revision and authorization checks if another executor has already changed state.
- Idempotency metadata has an explicit bounded lifecycle and can be removed independently of immutable document history and audit events.
