---
node_id: SourceDocument:permanently-discard-never-published-documents-pl:3703b799c811
title: Permanently discard never-published documents plan
type: SourceDocument
source_path: D:\develop\minerva\docs\superpowers\plans\2026-07-14-document-discard-unpublished.md
edges_in:
  summarizes: [project-pulse]
source_kind: SourceDocument
---

# Permanently discard never-published documents plan

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
