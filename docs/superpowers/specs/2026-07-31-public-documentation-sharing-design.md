# Public documentation sharing: audited design

Status: approved  
Date: 2026-07-31

## Goal

Let an authorized project member create a revocable public link for either one
published documentation page or a published branch. A guest can open the link
without a Minerva account, navigate only within the granted scope, and read the
content in a dedicated distraction-free screen.

## Audited baseline

The repository already provides:

- project-scoped Documents services protected by stable permission codes;
- active adjacency-list document trees with stable IDs and slugs;
- immutable complete publication snapshots with titles, Tiptap content,
  internal-link targets, and referenced image IDs;
- a safe recursive Vue renderer without `v-html`;
- protected project image endpoints and allow-listed Figma embed descriptors;
- a global authentication middleware and an authenticated default layout;
- installed Dialog, AlertDialog, RadioGroup, Sheet, ScrollArea, Alert, Badge,
  Skeleton, Spinner, Button, Breadcrumb, and Sidebar primitives.

The audit found five boundaries that cannot be reused directly:

1. `getDocumentForUser` returns current drafts after membership authorization.
2. `DocumentViewer` derives edit/history actions from the project store.
3. Internal links and images point to authenticated `/projects/...` routes.
4. The default layout always mounts authenticated application navigation.
5. The global route middleware redirects every unknown guest route to sign-in.

## Product rules

### Scope

Use the closed scopes:

- `document`: expose the root page only;
- `branch`: expose the root and eligible current descendants.

A branch is dynamic. A page is eligible only when:

- the project, share root, page, and every ancestor between root and page are
  active;
- the page is currently within the root's descendant closure;
- the page and its visible ancestor chain each have at least one immutable
  published version.

The public title and body always come from each page's latest published version.
Current draft titles, bodies, revisions, publication comments, and pending tree
nodes are never projected.

### Link lifecycle

The first release permits one active link per root document and scope. The share
dialog can show separate active states for `Только эта страница` and
`Вся ветка`.

- Create generates a new cryptographically random token and returns the full
  URL once.
- Rotate revokes the old token and returns a replacement atomically.
- Revoke closes access immediately.
- Recreating after revocation creates a distinct record and token.
- Durable links have no automatic expiry in the first release.

The server stores a lookup hash and a versioned encrypted token envelope. A
currently authorized management request may decrypt the token and return the
existing URL for copying. The client keeps it only in transient dialog state;
Pinia, analytics, logs, and audit never retain it. `Обновить ссылку` rotates a
suspected or intentionally replaced capability.

### Public reader

Route shape:

```text
/share/documentation/:token
/share/documentation/:token/:documentId
```

The first route opens the share root. The second selects an eligible page from
the same branch. An invalid child ID returns the same unavailable state as an
invalid share rather than revealing scope membership.

Desktop composition:

- narrow header with Minerva name, shared project/page context, theme control,
  and `Войти`;
- compact left documentation tree only for a branch;
- centered `max-w-4xl` article using the established typography;
- no global sidebar, breadcrumbs into private routes, pagination menu,
  assistant, edit/publish/history/details controls, or project settings.

On narrow screens the tree opens in a titled Sheet. A document-only share has no
tree. Loading uses Skeleton, failures use a neutral Empty/Alert, and no error
distinguishes invalid, revoked, archived, or expired state.

### Sharing dialog

Add `Поделиться` with `Share2` to the document action area for users with
`documents.share`.

Use a titled Dialog containing:

- a RadioGroup for `Только эта страница` and `Вся ветка`;
- an Alert explaining that only published versions are visible;
- an additional branch warning that future published descendants are included;
- the current active/revoked state as Badge text;
- `Открыть доступ`, `Скопировать ссылку`, and `Обновить ссылку` actions;
- a titled AlertDialog before revocation or rotation.

The button remains available when a newer draft exists, but the dialog clearly
states that guests continue to see the latest published snapshot. A page with no
published version cannot be shared and instead offers the existing publication
flow to authorized publishers.

## Server architecture

### Storage

Add `document_public_shares` with:

- ID, project ID, root document ID, and scope;
- unique SHA-256 token hash;
- token ciphertext, nonce, and encryption key version;
- creator and optional revoker user IDs;
- creation, revocation, and update timestamps;
- integrity checks for closed scope and revocation timestamp/user pairing;
- an active partial unique index on `(project_id, root_document_id, scope)`.

Use the existing composite document/project relationship so a share cannot bind
to a root in another project. Use the existing versioned secret-encryption
primitive with a domain-specific purpose/context so encrypted share tokens
cannot be confused with credentials or AI provider keys. Physical deletion
follows the document/project lifecycle; revoked rows retain the encrypted
envelope and content-free audit-supporting metadata until a later bounded
cleanup decision.

### Application services

Keep pure functions for:

- token normalization and hashing input boundaries;
- share lifecycle decisions (`create | rotate | revoke | replay | invalid`);
- descendant closure and published-chain filtering;
- public tree/detail projection;
- internal-link availability.

Inject narrow effects for secure randomness, time, persistence, and audit.

Authenticated management services recheck:

- active account, project, and membership;
- `documents.share` permission;
- active root in the same project;
- existence of a published snapshot.

The public read service hashes the presented token, loads only an active share,
checks current project/root state, derives the eligible scope, and returns one
strict public projection. It never calls the authenticated reader with a fake
user.

### HTTP boundaries

Authenticated management endpoints:

```text
GET    /api/projects/:projectId/documents/:documentId/shares
POST   /api/projects/:projectId/documents/:documentId/shares
POST   /api/projects/:projectId/documents/:documentId/shares/:shareId/rotate
DELETE /api/projects/:projectId/documents/:documentId/shares/:shareId
```

Public endpoints:

```text
GET /api/public/documentation/:token
GET /api/public/documentation/:token/pages/:documentId
GET /api/public/documentation/:token/images/:imageId
```

Every public response is no-store/noindex/no-referrer. Token route parameters
are validated before hashing, excluded from errors and telemetry, and redacted
from access logging. Unknown and inaccessible resources return the same 404
body. Public routes receive a bounded per-IP failure rate limit without storing
successful visitor identity.

### Images, links, and embeds

- Public images are served only if referenced by an eligible page's latest
  snapshot. Storage object keys never leave the server.
- Public internal links are rewritten to the current share route only when the
  target is eligible. Other targets render unavailable.
- External HTTP links keep `noopener noreferrer`.
- Figma embeds remain allow-listed structured iframes and inherit
  `Referrer-Policy: no-referrer`, preventing the capability URL from being sent
  to Figma.
- Public responses never expose generic files because that feature is not yet
  implemented.

## Security analysis

### Capability secrecy

Use 32 random bytes encoded in URL-safe base64, persist SHA-256 for lookup, and
persist the recoverable token only as a versioned authenticated-encryption
envelope. OWASP recommends cryptographically generated, sufficiently long URL
tokens and secure server-side storage for bearer-style recovery links; the same
guessing and database-read risks apply to a public share capability.

The token necessarily appears in the shared URL and browser history. Minerva
reduces secondary disclosure through no-referrer headers, log redaction, no
analytics, no third-party scripts, no-store responses, and immediate rotation
or revocation.

### Enumeration and authorization

Document IDs and slugs alone grant nothing. Every page and image request starts
from the capability hash and re-derives current scope. All inaccessible cases
look identical. Authenticated sessions neither broaden nor narrow a valid
capability; users without the link still need normal project authorization.

### Draft and metadata leakage

All public fields are built from immutable versions plus minimal active tree
structure. Draft content/title/revision, unpublished nodes, version history,
publication comments, backlinks outside scope, users, roles, and project
description are absent from the contract.

### Caching and indexing

`Cache-Control: no-store` prevents intentional browser/proxy storage;
`X-Robots-Tag` blocks indexing; `Referrer-Policy: no-referrer` prevents the full
capability path being sent with outgoing links and embeds. These controls cannot
prevent a legitimate recipient from copying the content.

## Alternatives rejected

- **Public flag on `documents`:** cannot support independent exact/branch links,
  rotation, or revocation and makes document IDs authorization credentials.
- **Reuse `documents.view` with an anonymous user:** invents a global identity,
  mixes membership RBAC with bearer capabilities, and risks exposing drafts.
- **Serve the current draft:** contradicts publication as the deliberate
  disclosure boundary and can leak unfinished changes automatically.
- **Store plaintext tokens:** turns a database read into immediate access to
  every shared document.
- **Hash-only tokens:** protects database reads but breaks the expected
  copy-existing-link behavior after every page reload; an encrypted envelope
  preserves that UX behind current management authorization.
- **Snapshot every branch member into the share:** avoids future automatic
  inclusion but becomes stale after legitimate tree changes and does not match
  a live documentation-branch link.
- **Expose the authenticated layout read-only:** still mounts private project
  providers and navigation and creates accidental API and UI coupling.

## Approval questions

Approval of this design accepts:

1. guests see only latest published snapshots, never drafts;
2. branch links dynamically include future published descendants;
3. links remain active until explicit rotation or revocation;
4. token lookup is hash-based while authorized copy-after-reload decrypts a
   versioned server-side envelope;
5. `documents.share` is a distinct Admin/Editor permission;
6. public pages use a separate layout and expose no authenticated application
   navigation.
