---
node_id: SourceDocument:minerva-agent-instructions:7b4afaaff5ff
title: Minerva agent instructions
type: SourceDocument
source_path: C:\Users\roma\.config\superpowers\worktrees\minerva\identity-backend-foundation\AGENTS.md
edges_in:
  summarizes: [project-pulse]
source_kind: SourceDocument
---

# Minerva agent instructions

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
