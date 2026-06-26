---
node_id: SourceDocument:minerva-product-specification:d29f24b551b5
title: Minerva product specification
type: SourceDocument
source_path: D:\develop\minerva\docs\product-spec.md
edges_in:
  summarizes: [project-pulse]
source_kind: SourceDocument
---

# Minerva product specification

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
