# Public documentation sharing implementation plan

Status: completed; Slices DS.1-DS.5 complete  
Date: 2026-07-31

## Preconditions

- Accept ADR 0024 and the audited public-sharing design.
- Keep the first release read-only, link-scoped, and published-snapshot-only.
- Implement vertical slices with failing behavior tests first.
- Never pass public capabilities through authenticated Documents services as a
  synthetic user.

## Slice DS.1: contracts, permission, lifecycle, and storage

Status: completed 2026-08-02.

1. Add closed share scopes, strict management/public contracts, token length
   limits, stable safe error codes, and `documents.share`.
2. Add pure failing tests for scope validation, token hashing, create, rotate,
   revoke, replay, and invalid transitions.
3. Add `document_public_shares`, token hash plus versioned encrypted envelope,
   integrity constraints, project/document foreign keys, active uniqueness, and
   lookup indexes through an additive migration.
4. Add a repository and management application service with active account,
   project, membership, permission, root, and published-version checks.
5. Write content-free audit events for creation, rotation, and revocation.
6. Prove cross-project, cross-user, removed-permission, unpublished, archived,
   duplicate, rotation, and concurrent-revocation behavior in PostgreSQL.

Acceptance: an authorized member can create, copy, rotate, and revoke an inert
encrypted capability without any public content endpoint yet.

## Slice DS.2: public published projection

Status: completed 2026-08-02.

1. Write pure tests for exact scope, descendant closure, dynamic moves,
   unpublished ancestor filtering, latest-version selection, and internal-link
   availability.
2. Add a dedicated public read service deriving minimal tree and page
   projections from active documents and immutable versions.
3. Return identical not-found outcomes for unknown, revoked, archived,
   cross-scope, and malformed capabilities.
4. Add no-store/no-referrer/noindex HTTP headers and explicit token redaction at
   logging/telemetry boundaries.
5. Add a public image service that requires both the share and a reference from
   an eligible latest snapshot.
6. Add bounded invalid-token rate limiting and database tests for token/hash,
   branch movement, publication updates, revocation, image isolation, and
   concurrent reads.

Acceptance: public APIs expose only the latest published content, tree metadata,
and referenced images allowed by one current capability.

## Slice DS.3: authenticated sharing dialog

Status: completed 2026-08-02.

1. Add strict feature API decoders and stateless `DocumentShareActions` for
   list/create/rotate/revoke/copy effects.
2. Add `Share2` to the document action area only for `documents.share`.
3. Compose a titled Dialog with RadioGroup scope choice, published-content
   Alert, branch warning, status Badge, and copy/open actions.
4. Use a titled AlertDialog for rotation and revocation, Spinner for pending
   actions, and `vue-sonner` for successful copying.
5. Decrypt an existing URL only through a current authorized action and retain
   plaintext only in transient component state.
6. Add desktop/mobile component tests plus permission, unpublished-page, draft-
   newer-than-published, error, and keyboard/focus cases.

Acceptance: an authorized member deliberately opens access, copies the new URL,
rotates it, or revokes it without exposing a token in store persistence or
analytics.

## Slice DS.4: public reader and navigation

Status: completed 2026-08-02.

1. Allow only the exact `/share/documentation/...` route family through guest
   middleware and add a dedicated public layout.
2. Add a public feature API/action/store that never imports authenticated
   project or Documents providers.
3. Build the centered safe article reader from the shared public projection.
4. Add compact desktop tree navigation for branch shares and a titled mobile
   Sheet; omit it for exact-document shares.
5. Add a share-aware rendering context for internal links and public images;
   retain allow-listed Figma embeds under no-referrer policy.
6. Add Minerva identity, theme control, and `Войти`, with no global/project
   sidebar, pagination menu, assistant, editor, history, or details panel.
7. Add neutral unavailable/loading states and never display raw server errors.

Acceptance: a guest can read and navigate exactly the granted published scope
on desktop and mobile, while ordinary private routes still require a session.

## Slice DS.5: abuse and release verification

Status: completed 2026-08-04.

1. Add browser journeys for exact and branch links, mobile navigation, sign-in,
   rotation, revocation, archive, branch movement, and newly published pages.
2. Test guessing, malformed/oversized tokens, rapid invalid attempts, direct
   image access, internal-link escape, unavailable ancestors, and concurrent
   revocation/read races.
3. Inspect headers, HTML, JSON, audit events, logs, analytics, browser history,
   and generated indexes for draft content, token, storage path, user, and
   out-of-scope title leakage.
4. Run focused and full unit/integration suites, Nuxt typecheck, production
   build, migration validation, and `git diff --check`.
5. Update product specification, architecture, roadmap, progress, and operations
   documentation only after the approved slices are verified.

Acceptance: possession of one active link grants only its published scope, and
rotation, revocation, archive, or scope changes fail closed on the next request.

## Deferred follow-ups

- optional expiry presets and access passwords;
- named recipient links and per-link usage analytics;
- custom public branding and custom domains;
- public full-text search within a branch;
- generic downloadable files;
- snapshot-style branch membership as an alternative to dynamic branches.
