---
node_id: SourceDocument:adr-0002-use-global-super-administration-and-pro:81e426d58974
title: ADR 0002: Use global super administration and project-scoped RBAC
type: SourceDocument
source_path: C:\Users\roma\.config\superpowers\worktrees\minerva\identity-backend-foundation\docs\decisions\0002-project-rbac.md
edges_in:
  summarizes: [project-pulse]
source_kind: SourceDocument
---

# ADR 0002: Use global super administration and project-scoped RBAC

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
