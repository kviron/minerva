# ADR 0023: Use short-lived server-owned AI document proposals

Date: 2026-07-31  
Status: accepted

## Context

Project AI Assistant can read authorized documentation and retain private
conversation history, but it cannot change documents. AI.6 needs create and
draft-update workflows without allowing model output to invoke a document
mutation directly.

The existing document services already validate Tiptap content, enforce stable
permission codes, and use optimistic draft revisions. However:

- `createDocument` currently derives initial content from a template, so a
  create-then-update sequence would expose a partially completed page;
- `updateDocumentDraft` is revision-safe but duplicate confirmation is not an
  idempotency boundary by itself;
- the general `read_document` assistant tool returns bounded visible text, not
  the exact Tiptap document required to preserve rich structure;
- a proposal may contain private documentation content and therefore needs
  explicit ownership, retention, and deletion rules.

## Decision

- Proposal capability is an explicit user-selected assistant mode. Normal chat
  turns never receive proposal tools, so instructions found in documentation
  cannot enable proposal creation.
- The model may call only proposal-producing tools. These tools may create a
  review record but cannot call document create/update persistence.
- Minerva stores a pending proposal in PostgreSQL, scoped to project, user,
  conversation, and turn request. The record contains a validated create or
  update payload, its exact base snapshot when applicable, expected draft
  revision, timestamps, and a server-generated ID. It contains no provider
  payload, hidden prompt, API key, raw tool result, or arbitrary executable
  content.
- Pending proposal payloads expire after fifteen minutes. Applied, rejected,
  stale, and expired proposals clear their content payload and retain only a
  content-free replay receipt for at most twenty-four hours before bounded
  physical purge.
- Proposal Tiptap JSON is validated by the existing document content boundary
  and additionally capped at 64 KiB for the first increment. Oversized
  documents fail closed with a user-visible request to edit manually; partial
  or lossy replacement is not attempted.
- Reading a proposal requires its owner, active project membership,
  `project.ai.use`, and the existing document read permission. Confirming it
  additionally rechecks `documents.create` or `documents.update_draft` and, for
  updates, the exact expected draft revision.
- Confirmation locks the proposal and performs the document mutation, proposal
  terminal transition, safe result receipt, and audit write atomically. Create
  and update reuse transaction-aware primitives extracted from the existing
  Documents application services; Nitro, MCP, and AI must not maintain separate
  business-rule implementations.
- Repeated or concurrent confirmation returns the stored safe result and never
  repeats the document effect. A revision conflict makes the proposal stale and
  requires a newly generated proposal.
- The audit actor remains the confirming user and channel remains `web`. Safe
  AI attribution includes proposal, conversation, turn-request, operation, and
  resulting document/revision identifiers, but no title, content, diff,
  question, answer, or provider data.
- AI.6 covers only document create and draft update. Archive, restore,
  publication, movement, and physical deletion require later decisions and
  distinct confirmations.

## Consequences

- Exact review and replay behavior survive page reloads and multiple Nitro
  instances without sending a signed, large proposal token through the browser.
- Two bounded copies of private document content may temporarily exist for an
  update proposal: the base snapshot and proposed snapshot. Their short TTL and
  immediate payload clearing after a terminal decision limit this exposure.
- Document create/update persistence needs a transaction-aware refactor before
  proposal confirmation can be implemented safely.
- The first increment intentionally refuses documents above the proposal size
  boundary. Supporting large-document semantic patches requires stable node
  identities or a separately accepted patch language.
- Proposal persistence precedes provider tools and document mutation
  implementation.
