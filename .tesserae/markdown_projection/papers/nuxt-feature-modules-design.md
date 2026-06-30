---
node_id: SourceDocument:nuxt-feature-modules-design:1dc66fa31506
title: Nuxt feature modules design
type: SourceDocument
source_path: D:\develop\minerva\docs\superpowers\specs\2026-06-29-nuxt-feature-modules-design.md
edges_out:
  uses_metric: [map]
edges_in:
  summarizes: [minerva-mvp-identity-planning, project-pulse]
source_kind: SourceDocument
---

# Nuxt feature modules design

> [!abstract] Source document

## Outgoing

- uses_metric → [[map]]

## Incoming

- [[minerva-mvp-identity-planning]] → summarizes
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
