---
node_id: SourceDocument:projects-list-and-create-ui-design:b11de69f5972
title: Projects list and create UI design
type: SourceDocument
source_path: D:\develop\minerva\docs\superpowers\specs\2026-07-05-projects-list-and-create-ui-design.md
edges_out:
  uses_metric: [map]
edges_in:
  summarizes: [minerva-mvp-blueprint, project-pulse]
source_kind: SourceDocument
---

# Projects list and create UI design

> [!abstract] Source document

## Outgoing

- uses_metric → [[map]]

## Incoming

- [[minerva-mvp-blueprint]] → summarizes
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
