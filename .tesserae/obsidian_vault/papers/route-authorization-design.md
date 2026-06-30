---
node_id: SourceDocument:route-authorization-design:2fc8906097c7
title: Route Authorization Design
type: SourceDocument
source_path: D:\develop\minerva\docs\superpowers\specs\2026-06-30-route-authorization-design.md
edges_in:
  summarizes: [project-pulse]
source_kind: SourceDocument
---

# Route Authorization Design

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
