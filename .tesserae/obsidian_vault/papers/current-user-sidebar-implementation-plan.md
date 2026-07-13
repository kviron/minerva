---
node_id: SourceDocument:current-user-sidebar-implementation-plan:30919ebc2609
title: Current User Sidebar Implementation Plan
type: SourceDocument
source_path: D:\develop\minerva\docs\superpowers\plans\2026-07-03-current-user-sidebar.md
edges_out:
  uses_metric: [map]
edges_in:
  summarizes: [minerva-mvp-planning, project-pulse]
source_kind: SourceDocument
---

# Current User Sidebar Implementation Plan

> [!abstract] Source document

## Outgoing

- uses_metric → [[map]]

## Incoming

- [[minerva-mvp-planning]] → summarizes
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
