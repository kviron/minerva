# ADR 0021: Use PostgreSQL leases and content-free AI usage events

Date: 2026-07-29  
Status: Accepted

## Context

Project AI turns can be started through both JSON and streaming HTTP boundaries. An in-memory concurrency guard or rate counter would be bypassable across server processes and after restarts. Provider calls also need cost and reliability evidence, but storing questions, answers, retrieved documentation, hidden prompts, provider payloads, or credentials in operational records would enlarge the private-content exposure surface.

## Decision

- Keep one PostgreSQL control row per project and user. Serialize admission with a transaction-scoped advisory lock and a row lock so every application instance observes the same state.
- Permit one active turn per project and user. Represent ownership with a random lease token that expires after the configured provider timeout plus a short cleanup grace period; only the matching token can release it.
- Apply a fixed-window limit of ten admitted starts per five minutes per project and user. Check an active lease before consuming rate quota, and apply the same lifecycle to JSON and SSE endpoints.
- Persist a content-free usage event only when the matching lease is released. Store project/user/connection/request identifiers, provider, model, nullable token counts, duration, closed outcome, bounded error code, and timestamp; never store question, answer, prompt, retrieved text, API keys, provider payloads, or raw paths.
- Release the lease, insert the usage event, and append a content-free project audit event in one transaction. Treat duplicate or stale completion as a no-op.
- Record completion, failure, cancellation, and authorization denial as distinct closed outcomes. Rejected concurrency and rate-limit admissions do not create provider usage events because no provider work began.

## Consequences

- Concurrency and cost controls remain effective with multiple Nitro instances and cannot be bypassed by switching turn endpoints.
- A crashed process can temporarily block another turn only until the bounded lease expires.
- Operational usage and audit data support troubleshooting and cost accounting without becoming a shadow conversation store.
- The fixed-window policy is intentionally simple. A future organization-wide quota or billing system will require a separate accepted decision and migration.
