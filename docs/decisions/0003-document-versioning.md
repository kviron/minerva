# ADR 0003: Separate mutable drafts from immutable published versions

Date: 2026-06-24  
Status: proposed

## Decision

Each document has one mutable draft guarded by an optimistic revision number. Publishing creates an immutable snapshot with a monotonic version number and required change summary. The snapshot fixes the title, validated Tiptap content, internal-link targets, and referenced image IDs.

## Rationale

Creating a historical version on every autosave produces noise. A draft/publication model supports frequent editing while keeping a meaningful changelog.

## Consequences

- Autosave conflicts return `DRAFT_CONFLICT`.
- Restoring a version copies the complete snapshot into a new draft state while preserving the document's current stable slug.
- Historical versions are never edited or deleted through ordinary application flows.
- Images referenced by historical versions may be archived but cannot be physically deleted while those references exist.
- Search distinguishes published content from drafts.
