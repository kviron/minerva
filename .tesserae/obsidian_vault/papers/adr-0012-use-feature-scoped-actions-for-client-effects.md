---
node_id: SourceDocument:adr-0012-use-feature-scoped-actions-for-client-e:bf4977d67411
title: ADR 0012: Use feature-scoped actions for client effects
type: SourceDocument
source_path: D:\develop\minerva\docs\decisions\0012-use-feature-scoped-actions-for-client-effects.md
edges_in:
  summarizes: [project-pulse]
source_kind: SourceDocument
---

# ADR 0012: Use feature-scoped actions for client effects

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
