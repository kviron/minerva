# ADR 0022: Retain private AI conversations for thirty days

Date: 2026-07-30  
Status: accepted

## Context

Project AI Assistant Slice AI.4 keeps one conversation only in browser memory.
Persistent history contains user questions, model answers, and document citation
identifiers, so its ownership, authorization, retention, deletion, and purge
behavior must be explicit before content is written to PostgreSQL.

## Decision

- Every conversation belongs to exactly one project and one user. Only that user
  may list, read, archive, or restore it, and every operation also requires the
  current server-side `project.ai.use` permission for an active account, project,
  and membership.
- Active conversations expire thirty days after their most recent persisted
  message. Activity renews the expiry; merely listing or reading history does not.
- Manual deletion is recoverable archival. It hides the conversation from active
  history immediately, exposes it in the owner's project-local trash for seven
  days, and then permits bounded physical purge. Restoring renews the thirty-day
  active expiry.
- Automatic retention expiry and elapsed trash grace both physically delete the
  conversation and cascade only to its messages. Cleanup operates in bounded,
  lock-safe batches and is safe to retry.
- Persist only user-visible user and assistant messages, their explicit
  timestamps, and validated Minerva citation document IDs/titles. Do not persist
  hidden prompts, provider payloads, tool calls/results, retrieved excerpts,
  model credentials, request headers, or raw errors.
- Losing membership, losing `project.ai.use`, account disablement, or project
  archival makes history inaccessible on the next request without changing the
  retention clock. Conversation content is not exposed through MCP, audit
  metadata, logs, analytics, or generated indexes.

## Consequences

- History is private to its author rather than a shared project chat.
- Pagination and cursors must be scoped by project, user, and active/trash state.
- Conversation activity and recoverable deletion require dedicated timestamps
  and indexes, plus a periodic production cleanup invocation.
- Account deletion must explicitly purge or anonymize owned conversations before
  removing the user; the conversation foreign key does not bypass ADR 0009 with
  cascading user deletion.
