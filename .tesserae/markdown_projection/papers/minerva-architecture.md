---
node_id: SourceDocument:minerva-architecture:ed1ca257adb0
title: Minerva architecture
type: SourceDocument
source_path: C:\Users\roma\.config\superpowers\worktrees\minerva\identity-backend-foundation\docs\architecture.md
edges_in:
  summarizes: [project-pulse]
source_kind: SourceDocument
---

# Minerva architecture

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
