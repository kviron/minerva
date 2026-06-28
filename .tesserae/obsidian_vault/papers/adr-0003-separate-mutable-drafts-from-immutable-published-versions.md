---
node_id: SourceDocument:adr-0003-separate-mutable-drafts-from-immutable-:27a2a19ac4f3
title: ADR 0003: Separate mutable drafts from immutable published versions
type: SourceDocument
source_path: C:\Users\roma\.config\superpowers\worktrees\minerva\identity-backend-foundation\docs\decisions\0003-document-versioning.md
edges_in:
  summarizes: [project-pulse]
source_kind: SourceDocument
---

# ADR 0003: Separate mutable drafts from immutable published versions

> [!abstract] Source document

## Outgoing

_None._

## Incoming

- [[project-pulse]] → summarizes

## Related (dataview)

```dataview
LIST
FROM "papers" OR "concepts" OR "claims"
WHERE contains(file.outlinks, this.file.link) AND file.name != this.file.name
SORT file.name
LIMIT 25
```

<!-- user-notes:start -->

<!-- user-notes:end -->
