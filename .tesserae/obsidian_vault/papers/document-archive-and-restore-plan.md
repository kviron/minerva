---
node_id: SourceDocument:document-archive-and-restore-plan:142d78fd4d07
title: Document archive and restore plan
type: SourceDocument
source_path: D:\develop\minerva\docs\superpowers\plans\2026-07-14-document-archive-restore.md
edges_in:
  summarizes: [project-pulse]
source_kind: SourceDocument
---

# Document archive and restore plan

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
