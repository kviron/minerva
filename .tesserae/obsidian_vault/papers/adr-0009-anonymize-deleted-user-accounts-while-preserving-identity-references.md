---
node_id: SourceDocument:adr-0009-anonymize-deleted-user-accounts-while-p:d0153bc9018c
title: ADR 0009: Anonymize deleted user accounts while preserving identity references
type: SourceDocument
source_path: D:\develop\minerva\docs\decisions\0009-anonymize-deleted-user-accounts.md
edges_in:
  summarizes: [project-pulse]
source_kind: SourceDocument
---

# ADR 0009: Anonymize deleted user accounts while preserving identity references

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
