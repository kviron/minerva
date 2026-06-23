# ADR 0003: Separate mutable drafts from immutable published versions

Date: 2026-06-24  
Status: proposed

## Decision

Each document has one mutable draft guarded by an optimistic revision number. Publishing creates an immutable snapshot with a monotonic version number and required change summary.

## Rationale

Creating a historical version on every autosave produces noise. A draft/publication model supports frequent editing while keeping a meaningful changelog.

## Consequences

- Autosave conflicts return `DRAFT_CONFLICT`.
- Restoring a version creates a new draft state.
- Historical versions are never edited or deleted through ordinary application flows.
- Search distinguishes published content from drafts.

