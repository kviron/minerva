# ADR 0006: Use Bun as the package manager

Date: 2026-06-27  
Status: proposed

## Context

The foundation plan originally named pnpm as the package manager for dependency installation, lockfile management, workspace commands, and CI. Before application implementation begins, the project needs one canonical package manager so local development and CI remain reproducible.

## Decision

Use Bun as Minerva's package manager for the first release. Bun replaces pnpm for dependency installation, lockfile management, package scripts, workspace commands, and future CI setup.

Node.js remains the JavaScript runtime target for the Nuxt/Nitro application unless a later accepted ADR changes the runtime. Bun is selected here as package-management tooling, not as a production runtime commitment.

## Consequences

- Slice 1 foundation work must create and maintain Bun package-manager metadata and lockfiles instead of pnpm files.
- Developer setup, CI, and documented commands must use Bun equivalents such as `bun install`, `bun run`, and `bunx` where appropriate.
- Historical Superpowers plans that mention pnpm are superseded by this ADR and must be adapted before execution.
- Dependency versions remain exact and upgrades remain separately reviewed tasks.
