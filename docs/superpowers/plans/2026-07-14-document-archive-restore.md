# Document archive and restore plan

Date: 2026-07-14  
Status: approved in conversation

## Outcome

An authorized member can recoverably archive an active document branch, inspect archived branches, and restore the complete branch with its hierarchy, stable IDs, slugs, drafts, and immutable publication history intact.

## Rules

- Archiving requires `documents.archive`; restoring requires `documents.restore`; listing archive metadata requires `documents.view`.
- Archiving a document archives that document and every active descendant in one archive batch.
- The confirmation shows the number of affected pages. A descendant that must remain active has to be moved out first.
- Active sibling positions are compacted after the branch root is removed.
- Restore returns the whole batch to the branch root's original active parent and inserts it at the nearest valid original position.
- Restore is rejected safely while the original parent remains archived.
- Project-local slugs remain unique across active and archived documents, so restore never changes stable URLs.
- Draft revision, content, publication state, versions, and ownership are not modified by archive or restore.
- Missing resources and denied access return the same safe not-found result.
- Audit metadata contains batch/root identifiers, parent/position, and page count, never titles or content.

## UI

- The reader-tree three-dot menu adds destructive `В архив` only for members with `documents.archive`.
- A titled AlertDialog explains that the complete branch is affected and stays open until the request succeeds.
- The Documentation landing screen gains `Страницы` and permission-aware `Архив` tabs.
- Archive rows show the root title, page count, archive date, and actor. Restore uses a titled AlertDialog.

## TDD slices

1. Test pure subtree collection and compact/restore placement rules.
2. Add migration coverage for archive batches and project-wide stable slug uniqueness.
3. Test transactional archive/list/restore services, permissions, hierarchy preservation, and content-free audits.
4. Add strict Nitro boundaries and shared contracts.
5. Add stateless actions, tree confirmation, archive tab, and explicit Pinia application.
6. Apply the migration and run focused integration tests, unit tests, typecheck, production build, progress update, and Tesserae refresh.
