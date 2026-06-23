# Tesserae development memory

Tesserae is a local development aid. It is not a Minerva runtime service and its generated state is not committed.

## Installation

```powershell
uv tool install tesserae
```

## Initialize or rebuild

From the repository root:

```powershell
$env:PYTHONUTF8='1'
$env:PYTHONIOENCODING='utf-8'
tesserae init --yes --name minerva --source AGENTS.md --source docs --llm-provider codex
tesserae compile
tesserae projects register 'D:\develop\minerva' --name minerva --activate
```

Add `app`, `server`, `shared`, and test paths to Tesserae sources after the Nuxt workspace is approved and created.

## Session policy

Only import Codex sessions associated with `D:\develop\minerva`. Session-derived findings are non-canonical until copied into an accepted spec, ADR, roadmap, or progress document.

Never ingest:

- `.env` files or secrets;
- credentials and tokens;
- uploaded customer files;
- database dumps or backups;
- generated build output;
- unrelated project sessions.

## Refresh

```powershell
$env:PYTHONUTF8='1'
$env:PYTHONIOENCODING='utf-8'
tesserae refresh
```

Run refresh after accepted documentation changes and after each completed implementation slice.

Tesserae 0.10.1 can fail on Windows when replacing an existing generated JSON file. If refresh reports `WinError 183` for `graph.tmp` or `code-graph.tmp`, remove only the corresponding generated `.json` targets inside `.tesserae` and rerun:

```powershell
Remove-Item -LiteralPath '.tesserae\graph.json' -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath '.tesserae\code-graph.json' -Force -ErrorAction SilentlyContinue
tesserae refresh
```

## MCP

Generate the current local MCP command with:

```powershell
tesserae projects mcp-config --project D:\develop\minerva --server-name minerva-memory
```

Inspect `codex mcp list` after registration. The server must run locally over stdio.
