---
node_id: SourceDocument:adr-0004-limit-the-first-mcp-release-to-document:e9d59fced9d7
title: ADR 0004: Limit the first MCP release to documentation workflows
type: SourceDocument
source_path: C:\Users\roma\.config\superpowers\worktrees\minerva\identity-backend-foundation\docs\decisions\0004-mcp-first-release-boundary.md
edges_in:
  summarizes: [project-pulse]
source_kind: SourceDocument
---

# ADR 0004: Limit the first MCP release to documentation workflows

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
