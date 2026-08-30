# Project AI Assistant design

Status: approved  
Date: 2026-07-15

## Goal

Add a project-scoped assistant that is available from every project page. A member can ask questions about authorized project documentation and, in later slices, ask the assistant to propose documentation changes. The assistant must never bypass the current user's project RBAC or expose provider credentials, Minerva Credentials records, private storage paths, or cross-project content.

## First release boundary

The first vertical slice is deliberately read-only:

- one floating assistant trigger mounted by `ProjectShell`;
- one titled right-side Sheet containing a project-local conversation;
- `MessageScroller` for accessible streaming turns and stable scroll behavior;
- one configured OpenAI-compatible provider connection per project;
- answers grounded only in documentation returned by the existing authorization-aware search/read services;
- citations that navigate to the referenced Minerva document;
- no document mutations, publishing, credentials access, arbitrary URL fetching, code execution, MCP calls, or browser-held provider keys.

Mutation capabilities are a later gated slice. The model may produce a proposed patch, but Minerva owns validation, diff rendering, optimistic revision checks, permission evaluation, explicit user confirmation, application-service execution, idempotency, and audit.

## UX

`ProjectShell` owns the assistant trigger so it persists across overview, documentation, editor, and settings routes. The trigger is hidden when the project itself is inaccessible. Opening it renders a titled `Sheet` on desktop and the same accessible overlay behavior on narrow screens.

The panel contains:

1. Header with `AI-помощник`, current project name, provider/model status, and a new-conversation action.
2. `MessageScrollerProvider`, viewport, content, message items, and scroll-to-end button.
3. Empty state with safe example questions about project documentation.
4. User and assistant turns, streaming state, citations, retry state, and a clear failure Alert.
5. Bottom `InputGroup` with textarea, send button, stop button while streaming, and an explicit notice that answers may be inaccurate.

Conversation state survives project-page navigation. Switching project changes the active conversation namespace and never carries context into the new project. The first slice may retain only the current conversation in client memory; persistent history is added only with retention and deletion rules.

Project settings receive an `AI-помощник` section visible only to members with a new stable permission `project.ai.manage`. It shows connection status, provider, model, last validation time, and safe limits. The API key is accepted only by a dedicated no-store write endpoint and is never returned. A replacement key overwrites the encrypted secret; disconnect is recoverable only by entering a new key.

## Authorization

Stable permission codes, not roles or UI visibility, are authoritative:

- `project.ai.use`: open the assistant and submit questions;
- `project.ai.manage`: configure provider, model, system instructions, and limits;
- later document proposals still require the existing document read permission;
- applying a proposal requires the exact existing mutation permission such as `documents.update_draft`, `documents.create`, `documents.archive`, or `documents.publish` at execution time.

Built-in role defaults are proposed as:

- Viewer: `project.ai.use`;
- Editor: `project.ai.use`;
- Project Admin: `project.ai.use` and `project.ai.manage`.

The assistant executes as the signed-in user, never as a project service account. Disabling the user, removing membership, changing RBAC, disconnecting the provider, or archiving the project must affect the next request.

## Server architecture

Add an `ai-assistant` server module with narrow application boundaries:

- provider connection management and encrypted-secret persistence;
- a provider-neutral chat port accepting validated messages, allowed tools, timeout, and token budget;
- one OpenAI-compatible HTTP adapter at the infrastructure edge;
- conversation orchestration that builds a minimal system prompt and runs only allow-listed documentation tools;
- pure tool-call planning/result mapping separated from network and database effects;
- usage accounting and content-free audit attribution.

Nitro handlers remain thin. The orchestration service calls the existing document search/read/version services directly; it does not call Minerva over HTTP or MCP. This preserves one authorization and business-rule path.

Provider failures map to stable domain codes. Raw provider responses, stack traces, request headers, and keys never reach the browser. Streaming uses a bounded server response with cancellation propagation and a hard total deadline.

## Data model

Use dedicated tables rather than ordinary project Credentials:

- `project_ai_connections`: project, provider kind, model, encrypted API key ciphertext/nonce/key version, status, safe configuration, created/updated attribution;
- later `ai_conversations` and `ai_messages` only after retention is approved;
- `ai_usage_events`: project/user/provider/model, request ID, input/output token counts when reported, duration, outcome, and timestamp, without prompts or completions.

Encryption reuses the existing versioned authenticated-encryption capability but uses AI-specific associated-data context. No ciphertext, nonce, key version, raw key, provider authorization header, prompt, response, or document excerpt enters audit metadata.

## Grounding and tool policy

The model receives no database access. Initial allow-listed tools are read-only projections equivalent to:

- search authorized project documentation;
- read one authorized active document;
- list authorized document tree entries;
- optionally read an authorized immutable version.

Each tool input is strict and project ID is supplied by trusted server context, not accepted from the model. Tool calls are capped per turn, results are size-bounded, and citations use stable document IDs/slugs. Instructions found inside documents are untrusted content and cannot change the system/tool policy.

## Threat model

### Prompt injection

Documents may contain instructions intended to override the assistant. The system prompt labels retrieved text as untrusted project content. Tool availability is fixed server-side, tool inputs are validated, the project context cannot be changed by model output, and read-only answers cannot trigger mutations.

### Credential exposure

Provider keys remain server-side, encrypted at rest, accepted through no-store endpoints, redacted from errors, and excluded from list projections, audit, logs, analytics, Tesserae, MCP, and browser state. The assistant has no access to Minerva Credentials services or tables.

### Authorization drift

Every search, read, and later mutation evaluates the current user and stable permission code when the tool executes. Retrieved context is not reused after a project/user/permission boundary change without reauthorization.

### Cross-project leakage

Project ID comes from authenticated route context and is closed over by the tool adapter. Provider prompts contain only results authorized for that project. Cache and conversation keys include project and user identity.

### Uncontrolled mutations

No mutation tool exists in the first slice. Later model output creates a proposal only. Minerva renders an exact diff, requires explicit confirmation, rechecks permissions and expected revision, and calls existing idempotent application services. Publication, archive, restore, and destructive effects have separate confirmations.

### Cost and denial of service

Enforce per-user and per-project request limits, input length, retrieved-context size, tool-call count, output-token budget, concurrency, cancellation, and provider timeout. Project Admin configures limits within server maximums. Usage metadata supports monitoring without storing content.

### Unsafe output

Assistant output is rendered as text/validated rich content without `v-html`. Links use an allow-list. Citations resolve through Minerva routes. Provider errors are non-revealing and Russian-first.

## Audit

Record connection create/update/disconnect/test and assistant turn completion/failure with channel `web`, actor, project, provider kind, model, request ID, tool names, document IDs used as citations, token counts when available, duration, and outcome. Do not store keys, prompts, completions, document text, tool-result text, or provider payloads in audit metadata.

## Deferred

- OAuth login to model vendors;
- multiple simultaneous providers per project;
- persistent searchable conversation history;
- image/file understanding;
- web browsing;
- vector database/RAG infrastructure;
- autonomous/background agents;
- credential-vault access;
- direct mutation or publication without preview and confirmation.

## Acceptance for the read-only slice

An authorized member opens the assistant from any page in one project, asks a documentation question, receives a streamed Russian answer with navigable citations derived only from currently authorized documents, and can cancel the response. A user without `project.ai.use`, a project without a valid connection, a disabled member, and a cross-project tool attempt all fail safely. No provider secret or unauthorized document content appears in browser projections, logs, audit, errors, MCP, or generated indexes.
