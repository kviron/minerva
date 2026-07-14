# ADR 0003: Separate mutable drafts from immutable published versions

Date: 2026-06-24  
Status: accepted

## Decision

Each document has one mutable draft guarded by an optimistic revision number. The draft is persisted only through an explicit user save; there is no timer-based or navigation-triggered autosave. Publishing creates an immutable snapshot with a monotonic version number and an optional change summary. The snapshot fixes the title, validated Tiptap content, internal-link targets, and referenced image IDs.

## Rationale

Creating a historical version on every draft save produces noise. A draft/publication model supports iterative editing while keeping a meaningful changelog. The draft revision is a concurrency counter, not a user-facing historical version.

## Consequences

- Stale explicit draft saves return `DRAFT_CONFLICT`.
- Restoring a version copies the complete snapshot into a new draft state while preserving the document's current stable slug.
- Historical versions are never edited or deleted through ordinary application flows.
- Images referenced by historical versions may be archived but cannot be physically deleted while those references exist.
- Search distinguishes published content from drafts.
