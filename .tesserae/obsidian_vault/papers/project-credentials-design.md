---
node_id: SourceDocument:project-credentials-design:38735cbc9ec3
title: Project Credentials Design
type: SourceDocument
source_path: D:\develop\minerva\docs\superpowers\specs\2026-07-11-project-credentials-design.md
edges_in:
  summarizes: [project-pulse]
source_kind: SourceDocument
---

# Project Credentials Design

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
