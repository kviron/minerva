# ADR 0024: Use revocable capability links for public documentation

Date: 2026-07-31
Status: accepted
Accepted: 2026-08-02

## Context

Project members need a Figma-like `Поделиться` action that lets anyone holding
the link read either one documentation page or a complete page branch without
creating a Minerva account.

The existing Documents reader is not a safe public boundary. It requires a
session and `documents.view`, returns the current draft, builds links to private
project routes, and loads images through authenticated project endpoints. The
default application layout also exposes the global sidebar, project header,
assistant, and authenticated navigation.

Public access therefore needs a distinct authorization capability, projection,
route tree, layout, image boundary, and revocation model. A document UUID or
slug alone must never grant access.

## Decision

- Public access uses an unguessable server-generated capability token.
  PostgreSQL stores its SHA-256 lookup hash plus a versioned encrypted envelope,
  never plaintext. Only a currently authorized `documents.share` management
  request may decrypt it to copy the existing URL.
- Tokens contain at least 256 bits from a cryptographically secure random
  generator. They are never accepted from query parameters, persisted in
  analytics or audit metadata, copied to Tesserae, or written to application
  logs. Public route logging must redact the token segment.
- A share has one closed scope: `document` or `branch`. The root document is
  fixed. `document` exposes only that page. `branch` dynamically exposes the
  active root and its active descendants that currently have a published
  snapshot and whose path from the root is publishable.
- Public readers see the latest immutable published snapshot of every included
  page, not its current draft. A later draft edit does not leak before a new
  publication. Publishing a new version updates the public result. Archiving
  the project, root, page, or an ancestor makes that content unavailable.
- Branch membership follows the current tree. Moving a page out removes it;
  moving a published page into the branch can expose it. The management UI
  warns that future published descendants are included automatically.
- Internal links resolve only when their target is within the same active share
  scope. Other internal links render as unavailable. Public projections omit
  version history, edit state, owner/member data, private backlinks, audit
  records, credentials, assistant data, and draft revision metadata.
- Images use a separate public endpoint that validates the same share and
  proves the image is referenced by a currently exposed latest snapshot.
  Project image endpoints remain session protected.
- Managing links requires a new server-side permission code,
  `documents.share`. It is granted to built-in Project Admin and Editor roles,
  not Viewer. UI visibility is not an authorization check.
- A member with `documents.share` may create a link, rotate it, or revoke it.
  Rotation atomically revokes the old capability and returns a new one.
  Revocation takes effect on the next request. Links remain active until
  explicitly revoked in the first release.
- Create, rotate, and revoke operations write content-free project audit events.
  Anonymous reads do not create project audit rows and never store the token,
  document content, or visitor identity.
- Public responses use a dedicated contract and fail with the same `404` for an
  unknown, revoked, archived, or out-of-scope capability. They set
  `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, and
  `X-Robots-Tag: noindex, nofollow, noarchive`.
- Public pages use a dedicated layout with Minerva identity, compact branch
  navigation, centered readable content, responsive mobile navigation, and a
  `Войти` action. They do not mount the application sidebar, global project
  navigation, project assistant, editor, history, details panel, or mutation
  actions.

## Consequences

- Possession of the URL is authorization. Anyone receiving or forwarding it
  can read the scoped published material until revocation.
- Hash lookup plus envelope encryption preserves Figma-like copy-after-reload
  UX without making a database-only read sufficient to recover active links.
  Rotation remains required after suspected disclosure.
- Published snapshots provide a stable, auditable disclosure boundary and
  avoid leaking work-in-progress drafts.
- Dynamic branches match user expectations for documentation sections, but
  editors must understand that later published descendants may become public.
- Public image and internal-link rendering require a share-aware context rather
  than reusing authenticated project URLs.
- Search engines and shared caches are explicitly discouraged, but recipients
  can still copy or capture content after receiving legitimate access.

## Project lifecycle amendment

Accepted ADR 0028 amends the ordinary link lifetime for a project-level
archive event. Existing public links remain readable while the project is
paused or closed. Archiving a closed project atomically revokes every active
public capability, and restoring or reopening the project never resurrects
those links. New links require a separately reopened active project and the
current `documents.share` permission.
