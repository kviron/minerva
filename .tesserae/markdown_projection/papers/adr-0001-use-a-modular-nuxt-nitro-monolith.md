---
node_id: SourceDocument:adr-0001-use-a-modular-nuxt-nitro-monolith:36bf23e62f88
title: ADR 0001: Use a modular Nuxt/Nitro monolith
type: SourceDocument
source_path: C:\Users\roma\.config\superpowers\worktrees\minerva\identity-backend-foundation\docs\decisions\0001-modular-monolith.md
edges_in:
  summarizes: [project-pulse]
source_kind: SourceDocument
---

# ADR 0001: Use a modular Nuxt/Nitro monolith

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
