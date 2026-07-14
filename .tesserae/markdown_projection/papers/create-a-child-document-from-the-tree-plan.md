---
node_id: SourceDocument:create-a-child-document-from-the-tree-plan:c668b02e359c
title: Create a child document from the tree plan
type: SourceDocument
source_path: D:\develop\minerva\docs\superpowers\plans\2026-07-14-document-tree-create-child.md
edges_in:
  summarizes: [project-pulse]
source_kind: SourceDocument
---

# Create a child document from the tree plan

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
