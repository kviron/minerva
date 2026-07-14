---
node_id: SourceDocument:document-tree-move-and-reorder-plan:1a18184e6b6e
title: Document tree move and reorder plan
type: SourceDocument
source_path: D:\develop\minerva\docs\superpowers\plans\2026-07-14-document-tree-move-reorder.md
edges_in:
  summarizes: [project-pulse]
source_kind: SourceDocument
---

# Document tree move and reorder plan

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
