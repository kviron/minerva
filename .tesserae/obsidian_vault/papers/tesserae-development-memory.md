---
node_id: SourceDocument:tesserae-development-memory:4143790d0cae
title: Tesserae development memory
type: SourceDocument
source_path: D:\develop\minerva\docs\operations\tesserae.md
edges_in:
  summarizes: [project-pulse]
source_kind: SourceDocument
---

# Tesserae development memory

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
