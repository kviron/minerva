---
node_id: SourceDocument:adr-0015-allow-permanent-discard-only-for-never-:ad0e022447a8
title: ADR 0015: Allow permanent discard only for never-published document branches
type: SourceDocument
source_path: D:\develop\minerva\docs\decisions\0015-discard-never-published-document-branches.md
edges_in:
  summarizes: [project-pulse]
source_kind: SourceDocument
---

# ADR 0015: Allow permanent discard only for never-published document branches

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
