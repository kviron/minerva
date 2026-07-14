---
node_id: SourceDocument:document-internal-links-and-backlinks-plan:91b264292f5e
title: Document internal links and backlinks plan
type: SourceDocument
source_path: D:\develop\minerva\docs\superpowers\plans\2026-07-14-document-internal-links-backlinks.md
edges_in:
  summarizes: [project-pulse]
source_kind: SourceDocument
---

# Document internal links and backlinks plan

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
