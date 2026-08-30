# Project AI document proposals: audited design

Status: approved  
Date: 2026-07-31

## Goal

Allow an authorized project member to ask the assistant to prepare a new
documentation page or a change to an existing draft, inspect the exact
before/after result, and explicitly confirm it. Model output must never be the
authorization or mutation boundary.

## Audited baseline

The repository already provides:

- private project/user conversation history and bounded SSE turns;
- current `project.ai.use` authorization and permission-aware document reads;
- strict Tiptap validation with safe nodes, links, images, tables, and Figma
  descriptors, capped at 1,000,000 JSON characters and 10,000 nodes;
- `documents.create` and `documents.update_draft` application services;
- optimistic `draftRevision` checks for updates;
- content-free project audit and MCP mutation attribution;
- installed Dialog, AlertDialog, ScrollArea, Tabs, Alert, Badge, Skeleton,
  Spinner, and Button primitives.

The audit found four gaps that must be resolved before mutation work:

1. `createDocument` accepts a template rather than validated initial content.
   Calling create and update separately would not be atomic.
2. Create/update services start their own transactions. Proposal state and the
   document effect cannot yet commit atomically.
3. The normal assistant read tool exposes only bounded visible text. It cannot
   preserve exact Tiptap structure for a full-document proposal.
4. Current document mutations accept MCP attribution only. AI attribution needs
   a separate safe discriminated variant rather than overloading MCP fields.

## Product boundary

AI.6 includes:

- explicit proposal mode in the assistant composer;
- create-page proposals;
- update-active-draft proposals;
- exact review, reject, confirm, conflict, expiry, and duplicate-confirmation
  states;
- safe navigation to a successfully created or updated page.

AI.6 excludes:

- direct model mutations;
- archive, restore, move, publish, discard, or version restore;
- background or autonomous application;
- proposals shared with other project members;
- arbitrary HTML, script, URL fetching, credentials, MCP calls, or provider
  payload display;
- large-document patching above the first bounded proposal limit.

## User flow

1. The member explicitly selects `Предложить изменение` in the assistant
   composer and describes the desired create or update.
2. Only this turn receives proposal tools. Ordinary question mode remains
   read-only.
3. The assistant may inspect an authorized document through a proposal-specific
   exact-content read bounded to 64 KiB.
4. The model submits one strict proposal tool call. Minerva validates the full
   resulting content and stores a pending owner-scoped proposal. No document
   mutation occurs.
5. The assistant message displays a proposal card with operation, title, expiry,
   and `Проверить изменения`.
6. A titled wide Dialog loads the proposal from Minerva and displays:
   - operation and status badges;
   - title and parent changes;
   - exact base and proposed documents using the existing safe recursive
     renderer, side-by-side on wide screens and through Before/After tabs on
     narrow screens;
   - warnings for expiry or a stale draft revision.
7. `Отклонить` closes the proposal permanently. `Применить изменения` opens a
   titled AlertDialog explaining the draft effect.
8. Confirmation rechecks ownership, account/project/membership state, current
   permission, referenced images/internal resources, proposal expiry, and draft
   revision. Only then does one atomic application-service transaction mutate
   the document.
9. Success updates the proposal card and offers a Minerva document link.
   Conflict or changed permission never applies a partial result.

## Proposal state

Use closed states:

- `pending`: payload is reviewable and may be confirmed or rejected;
- `applied`: one atomic document effect completed and a safe replay result is
  available;
- `rejected`: the owner declined it;
- `stale`: target revision or target/parent state changed;
- `expired`: the review deadline elapsed.

Pure state transitions accept the stored state, current time, and command and
return an explicit result. Database time, UUID generation, authorization, and
document effects remain injected capabilities at the application boundary.

Pending payload:

- proposal kind;
- project, owner, conversation, and turn request IDs;
- target document ID or requested parent ID;
- expected draft revision for updates;
- exact base title/content for updates;
- proposed title/content;
- canonical content hash;
- creation and fifteen-minute expiry timestamps.

Terminal receipt:

- status and timestamps;
- safe error code or applied document ID/revision;
- no base/proposed content;
- purge deadline no later than twenty-four hours after the terminal transition.

One unique project/user/conversation/turn key prevents a repeated provider tool
round from creating multiple proposals.

## Server architecture

### Proposal generation

Add proposal-only provider tools behind an explicit `mode: proposal` turn
request:

- `read_document_for_proposal(documentId)` returns exact validated title,
  content, and revision only within the proposal bound;
- `propose_document_update(documentId, expectedRevision, title, content)`;
- `propose_document_create(parentId, title, content)`.

The trusted server supplies project and user identity. The model cannot supply
either. Tool argument and SSE/provider buffers receive separate bounded proposal
limits rather than silently removing existing limits.

The executor:

- rechecks current read authorization on every read/propose call;
- validates JSON strictly and parses content through `parseDocumentContent`;
- verifies target/parent belongs to the current active project;
- verifies every image and internal document reference is currently valid;
- persists at most one pending proposal for the admitted turn;
- returns only a safe proposal projection to provider orchestration.

Provider activity carries a validated proposal projection to the public
completion event. Conversation message reads derive live proposal projections
by joining proposal records on the existing turn request ID; proposal content is
not copied into conversation messages.

### Atomic confirmation

Refactor Documents persistence into shared transaction-aware primitives:

- create from a discriminated initial source:
  `template` for the existing UI/MCP flow or validated `content` for AI;
- update a validated draft within a caller-owned transaction;
- emit audit through a safe discriminated mutation attribution:
  `mcp` or `ai`.

Existing Nitro and MCP use cases continue to call the same public application
services. Proposal confirmation owns one transaction, locks the proposal row,
invokes the shared create/update primitive, records the terminal receipt, and
commits once.

Expected outcomes are discriminated results rather than exception-driven
branches: not found, permission denied (externally indistinguishable), expired,
rejected, stale revision, invalid referenced resource, already applied, and
unexpected infrastructure failure.

## Authorization matrix

| Operation | Required current server-side permissions |
|---|---|
| Submit proposal-mode turn | `project.ai.use` |
| Read exact content for proposal | `project.ai.use` + `documents.view` |
| Store create/update proposal | owner scope + the same read boundary |
| Review/reject proposal | owner scope + `project.ai.use` + document read |
| Confirm create | owner scope + `project.ai.use` + `documents.create` |
| Confirm update | owner scope + `project.ai.use` + `documents.update_draft` |

UI visibility is never an authorization decision. Role names are never checked.
Inaccessible, cross-project, cross-user, removed-member, disabled-account, and
archived-project records use the same safe not-found behavior.

## Security analysis

### Prompt injection

Proposal tools are absent from ordinary chat. In proposal mode, document data is
labelled untrusted and cannot change project/user context, proposal limits, or
tool definitions. Even a malicious proposal is inert until exact review and
confirmation; confirmation still validates content, permission, references, and
revision.

### Tampering and replay

The browser receives only a proposal ID and safe projection. It never submits
the proposed content back for confirmation. Concurrent confirmations serialize
on the server row, and the applied receipt returns the same safe result without
repeating the effect.

### Authorization drift

Proposal creation does not reserve permission. Confirmation re-reads current
account, project, membership, permission code, target state, referenced
resources, and revision inside the mutation transaction.

### Content exposure

Proposal endpoints are authenticated, owner-scoped, private/no-store, absent
from MCP, logs, analytics, and Tesserae. Payloads last fifteen minutes and are
cleared immediately on a terminal decision. Audit and receipts remain
content-free.

### Partial and stale effects

Proposal state and document mutation commit atomically. Update conflicts produce
`stale`; create fails if its parent is no longer active. No create-then-update
sequence is permitted.

### Denial of service

Reuse assistant admission/rate limits and allow one proposal per turn. Bound
proposal content to 64 KiB, one exact-content read, existing tool rounds,
provider timeout, and bounded cleanup. Documents above the limit are refused
without truncation.

## UI composition

Use only installed shadcn-vue primitives:

- existing Sheet and MessageScroller for the proposal card;
- ToggleGroup if already installed for answer/proposal mode, otherwise an
  existing DropdownMenu command without adding a registry dependency;
- titled Dialog with ScrollArea and responsive Tabs for exact review;
- Badge for operation/status, Alert for conflict/expiry, Skeleton/Spinner for
  loading, and Separator for structural division;
- a titled AlertDialog for the final explicit confirmation;
- `vue-sonner` for success feedback.

Render document content through the existing safe recursive renderer and never
through `v-html`. Component classes control layout only and use semantic tokens.

The local shadcn-vue component source confirms the required components are
installed. The CLI documentation lookup was not used because the managed
environment rejected elevated execution of the external CLI package.

## Alternatives rejected

- **Direct mutation tool:** violates the approved proposal-only boundary.
- **Client-held or signed proposal payload:** produces large browser tokens,
  complicates replay and revocation, and cannot provide an atomic receipt.
- **Create followed by update:** can leave a partial page and two independent
  audit/idempotency boundaries.
- **Store proposals in conversation messages:** conflicts with conversation
  retention and duplicates short-lived document content.
- **Generic JSON Patch in the first increment:** paths over recursive Tiptap JSON
  are brittle without stable node identities and make safe exact review harder.
- **Silently truncate large documents:** risks destructive loss of content.

## Approval questions

Approval of this design accepts:

1. explicit proposal mode rather than proposal tools in every chat turn;
2. PostgreSQL-owned pending payloads with a fifteen-minute review window;
3. a 64 KiB first-release proposal limit with fail-closed oversized documents;
4. content-free terminal receipts retained for at most twenty-four hours;
5. create/update only, with all other document mutations deferred.
