# Tesserae Harness: minerva

This project has a compiled Tesserae research graph. Treat markdown pages as a human-readable projection; the graph JSON is authoritative.

## Artifacts

- `.tesserae/graph.json` — authoritative typed ResearchGraph
- `.tesserae/markdown_projection/` — Obsidian/VS Code markdown projection
- `.tesserae/obsidian_vault/` — generated Obsidian vault
- `.tesserae/temporal_facts.jsonl` — temporal/provenance fact projection
- `.tesserae/graphiti_episodes.jsonl` — Graphiti-compatible episode export
- `.tesserae/cognee_bundle/` — Cognee JSONL bundle

## MCP server

Use the local MCP server to query the graph:

```text
command: python3
args: ["-m", "tesserae.mcp_server", "--graph", "D:\\develop\\minerva\\.tesserae\\graph.json"]
```

Expected MCP tools: `schema`, `graph_summary`, `search_nodes`, `node_context`, `search_facts`, `timeline`.

## Graph summary

- Nodes: 73
- Edges: 104

## Representative nodes

- **MATH** (`Benchmark`) — D:\develop\minerva\docs\superpowers\plans\2026-06-29-identity-functional-refactor.md
- **Minerva MVP Planning** (`CommunitySummary`) — Designs and implementation plans for Minerva's MVP navigation, identity, projects, route structure, feature modules, UI placeholders, and RBAC foundation.
- **mAP** (`Metric`) — D:\develop\minerva\docs\progress.md
- **ADR 0001: Use a modular Nuxt/Nitro monolith** (`SourceDocument`) — D:\develop\minerva\docs\decisions\0001-modular-monolith.md
- **ADR 0002: Use global super administration and project-scoped RBAC** (`SourceDocument`) — D:\develop\minerva\docs\decisions\0002-project-rbac.md
- **ADR 0003: Separate mutable drafts from immutable published versions** (`SourceDocument`) — D:\develop\minerva\docs\decisions\0003-document-versioning.md
- **ADR 0004: Limit the first MCP release to documentation workflows** (`SourceDocument`) — D:\develop\minerva\docs\decisions\0004-mcp-first-release-boundary.md
- **ADR 0005: Bind MCP tokens to one resource and enforce immediate revocation** (`SourceDocument`) — D:\develop\minerva\docs\decisions\0005-mcp-oauth-resource-and-revocation.md
- **ADR 0006: Use Bun as the package manager** (`SourceDocument`) — D:\develop\minerva\docs\decisions\0006-use-bun-package-manager.md
- **ADR 0007: Separate authentication identity, user profiles, contacts, and project roles** (`SourceDocument`) — D:\develop\minerva\docs\decisions\0007-separate-authentication-profiles-and-project-roles.md
- **ADR 0008: Use Nuxt-native client feature modules** (`SourceDocument`) — D:\develop\minerva\docs\decisions\0008-use-nuxt-native-feature-modules.md
- **ADR 0009: Anonymize deleted user accounts while preserving identity references** (`SourceDocument`) — D:\develop\minerva\docs\decisions\0009-anonymize-deleted-user-accounts.md

## Agent instructions

- Prefer MCP graph queries before grep-style rediscovery.
- Preserve the controlled ontology; do not invent node or edge types outside the Tesserae schema.
- Keep markdown projection generated; update sources and re-run compile instead of hand-editing generated pages.
- When adding code, run the project tests before reporting success.
