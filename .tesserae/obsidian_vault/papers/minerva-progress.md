---
node_id: SourceDocument:minerva-progress:c476087b907f
title: Minerva progress
type: SourceDocument
source_path: D:\develop\minerva\docs\progress.md
edges_out:
  uses_metric: [map]
edges_in:
  summarizes: [minerva-mvp-planning, project-pulse]
source_kind: SourceDocument
---

# Minerva progress

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
