---
node_id: SourceDocument:adr-0005-bind-mcp-tokens-to-one-resource-and-enf:af1463e26f9f
title: ADR 0005: Bind MCP tokens to one resource and enforce immediate revocation
type: SourceDocument
source_path: C:\Users\roma\.config\superpowers\worktrees\minerva\identity-backend-foundation\docs\decisions\0005-mcp-oauth-resource-and-revocation.md
edges_in:
  summarizes: [project-pulse]
source_kind: SourceDocument
---

# ADR 0005: Bind MCP tokens to one resource and enforce immediate revocation

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
