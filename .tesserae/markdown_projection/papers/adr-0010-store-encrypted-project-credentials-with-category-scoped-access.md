---
node_id: SourceDocument:adr-0010-store-encrypted-project-credentials-wit:4632cca78149
title: ADR 0010: Store encrypted project credentials with category-scoped access
type: SourceDocument
source_path: D:\develop\minerva\docs\decisions\0010-store-project-credentials-with-category-access.md
edges_in:
  summarizes: [project-pulse]
source_kind: SourceDocument
---

# ADR 0010: Store encrypted project credentials with category-scoped access

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
