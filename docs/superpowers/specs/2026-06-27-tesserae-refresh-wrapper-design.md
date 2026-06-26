# Tesserae refresh wrapper design

Status: approved
Date: 2026-06-27

## Problem

On Windows, Tesserae 0.10.1 repeatedly fails with `WinError 183` when replacing existing generated `graph.json` or `code-graph.json` files. Direct calls also risk non-UTF-8 subprocess input unless the required Python environment variables are set.

## Decision

The project uses `scripts/refresh-tesserae.ps1` as the only documented Tesserae refresh command.

The wrapper:

- resolves the repository root from its own location;
- sets `PYTHONUTF8=1` and `PYTHONIOENCODING=utf-8` for the refresh;
- validates that cleanup targets are direct children of the repository's `.tesserae` directory;
- removes only generated `graph.json` and `code-graph.json` targets before refresh;
- runs `tesserae refresh` from the repository root;
- restores the caller's working directory and process environment;
- fails when Tesserae is unavailable or returns a non-zero exit code.

`AGENTS.md` and `docs/operations/tesserae.md` must point to the wrapper instead of direct refresh commands.

## Boundaries

The wrapper never removes the `.tesserae` directory, temporary source files, sessions, databases, or application files. Generated Tesserae output remains excluded from commits.

## Verification

- A direct path-safety assertion verifies the two cleanup targets.
- Running the wrapper must report successful `sessions-import`, `compile`, and `obsidian-sync` stages.
- Git staging checks must exclude `.tesserae` output.
