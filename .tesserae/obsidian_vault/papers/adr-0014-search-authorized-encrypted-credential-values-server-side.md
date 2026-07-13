---
node_id: SourceDocument:adr-0014-search-authorized-encrypted-credential-:0f8d6d174a85
title: ADR 0014: Search authorized encrypted credential values server-side
type: SourceDocument
source_path: D:\develop\minerva\docs\decisions\0014-search-authorized-encrypted-credential-values.md
edges_in:
  summarizes: [project-pulse]
source_kind: SourceDocument
---

# ADR 0014: Search authorized encrypted credential values server-side

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
