---
node_id: SourceDocument:adr-0011-display-credential-logins-in-authorized:aec4bfcacf1d
title: ADR 0011: Display credential logins in authorized project lists
type: SourceDocument
source_path: D:\develop\minerva\docs\decisions\0011-display-credential-logins-in-project-lists.md
edges_in:
  summarizes: [project-pulse]
source_kind: SourceDocument
---

# ADR 0011: Display credential logins in authorized project lists

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
