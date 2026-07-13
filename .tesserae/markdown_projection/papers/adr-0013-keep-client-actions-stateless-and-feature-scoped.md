---
node_id: SourceDocument:adr-0013-keep-client-actions-stateless-and-featu:966a5da70b18
title: ADR 0013: Keep client actions stateless and feature-scoped
type: SourceDocument
source_path: D:\develop\minerva\docs\decisions\0013-keep-client-actions-stateless-and-feature-scoped.md
edges_in:
  summarizes: [project-pulse]
source_kind: SourceDocument
---

# ADR 0013: Keep client actions stateless and feature-scoped

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
