# Tesserae Competitive Hardening Report

## Open-source advantages absorbed

| System | Advantage | Tesserae absorption |
|---|---|---|
| MegaMem | Obsidian/project-local graph artifacts plus MCP exposure | `.tesserae/` project workspaces, compile, Cognee bundle, SQLite, markdown projection, MCP config |
| MegaMem | Sync state and analytics | content-hash manifest, processed/skipped counts, durable report output |
| Graphiti/Zep | temporal facts with validity and provenance | `temporal_facts.jsonl` projects every validated edge into temporal facts with `valid_from`, `current`, `invalidated_by`, confidence, evidence, and source provenance |
| Graphiti/Zep | custom entity/edge types | controlled research ontology and edge whitelist, rejecting schema drift instead of generic `Entity` sprawl |
| Graphiti MCP | fact/entity MCP tools | dependency-light stdio MCP `search_facts`, `timeline`, `search_nodes`, `node_context`, and schema tools |
| Agentic RAG/Qdrant-style systems | semantic retrieval substrate | Cognee export plus local Qwen/Ollama embedding path, no API key required |

## Tesserae differentiators retained

- controlled ontology rather than auto-discovered schema drift
- claim/evidence-first graph model for research intelligence
- project-local and no API key by default
- markdown is a projection, not the graph source of truth
- MCP server works without requiring Neo4j, FalkorDB, Qdrant, or Python MCP SDK

## Remaining next advantages to consider

- optional HTTP/SSE MCP transport with scoped tokens
- richer sync analytics dashboard
- graph diff/review UX for temporal invalidation decisions
- optional hybrid lexical+dense reranking over `temporal_facts.jsonl`
