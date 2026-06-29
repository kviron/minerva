---
node_id: SourceDocument:adr-0007-separate-authentication-identity-user-p:83396c0e3f00
title: ADR 0007: Separate authentication identity, user profiles, contacts, and project roles
type: SourceDocument
source_path: D:\develop\minerva\docs\decisions\0007-separate-authentication-profiles-and-project-roles.md
edges_in:
  summarizes: [project-pulse]
source_kind: SourceDocument
---

# ADR 0007: Separate authentication identity, user profiles, contacts, and project roles

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
