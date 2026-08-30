---
node_id: SourceDocument:projects-list-and-create-ui-implementation-plan:e222fdb83e93
title: Projects List and Create UI Implementation Plan
type: SourceDocument
source_path: D:\develop\minerva\docs\superpowers\plans\2026-07-05-projects-list-and-create-ui.md
edges_out:
  uses_metric: [map]
edges_in:
  summarizes: [minerva-mvp-blueprint, project-pulse]
source_kind: SourceDocument
---

# Projects List and Create UI Implementation Plan

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
