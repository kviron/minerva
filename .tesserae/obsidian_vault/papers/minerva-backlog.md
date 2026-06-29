---
node_id: SourceDocument:minerva-backlog:b1487ed798f6
title: Minerva backlog
type: SourceDocument
source_path: D:\develop\minerva\docs\backlog.md
edges_in:
  summarizes: [project-pulse]
source_kind: SourceDocument
---

# Minerva backlog

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
