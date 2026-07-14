# Document internal links and backlinks plan

Date: 2026-07-14  
Status: approved in conversation

## Outcome

Editors can link selected text, or insert a titled link, to another active page in the same project. Links retain a stable document ID through rename and tree movement, and readers can see which active pages currently link to the selected page.

## Rules

- Tiptap stores an internal link as a standard `link` mark whose canonical `href` is `document:<UUID>`.
- The server validates and extracts unique target IDs; client-supplied relation arrays are never trusted.
- A saved draft stores its current target IDs on `documents`; publishing copies the persisted list into the immutable version snapshot; restoring a version restores its target list with its content.
- Backlinks use current saved drafts from active source pages. Unsaved edits, archived sources, and historical-only links are excluded.
- Internal link targets are resolved only inside the current authorized project. Missing or archived targets render as unavailable and do not expose additional metadata.
- Existing external `https`, `http`, `mailto`, and safe relative links continue to work.

## TDD slices

1. Test pure content validation and stable target extraction.
2. Add draft target persistence migration and test draft save, publication snapshot, and version restore.
3. Test authorized internal-target resolution and backlink derivation in document reads.
4. Add the editor page-picker Dialog and stable-link insertion.
5. Render internal links and a backlinks section safely in the reader.
6. Run focused unit/integration tests, typecheck, build, update progress, and refresh Tesserae.
