# Identity functional refactor design

Status: approved design, awaiting implementation plan
Date: 2026-06-29

## Goal

Refactor the implemented Identity backend without changing its public behavior. Group server files by authentication scenario, replace repeated domain literals with shared `as const` objects and derived TypeScript types, and make side effects and dependencies explicit through small functional factories.

Before application refactoring begins, add a project-local functional TypeScript skill and configure the official Nuxt MCP server for Codex.

## Scope

This refactor includes:

- project-local Codex guidance for pragmatic functional TypeScript;
- project-local Nuxt MCP configuration;
- shared Identity constants and derived types;
- vertical grouping of the existing Identity module;
- extraction of pure transformations from effectful operations;
- explicit dependency injection for application services;
- import and test updates required by the moves;
- progress documentation and Tesserae refresh.

It excludes new roles, permissions, account states, endpoints, database fields, migrations, UI changes, authentication behavior, and FP runtime libraries such as `fp-ts` or `Effect`.

## Tooling setup

Create `.agents/skills/functional-typescript/` as a reusable, repository-local skill. Keep the skill concise and framework-independent. It must guide TypeScript refactors toward pure domain functions, immutable values, explicit dependency injection, narrow effect boundaries, and selective use of result values. It must also discourage abstractions that add ceremony without making dependencies, errors, or tests clearer.

Initialize the skill with the official skill scaffolding tools, generate its agent metadata, and validate it with the official skill validator. Because independent subagent execution is not authorized for this task, validate the skill structurally and apply it to this real refactor as its first forward test.

Create `.codex/config.toml` with the repository-scoped Nuxt MCP server:

```toml
[mcp_servers.nuxt]
url = "https://nuxt.com/mcp"
```

Do not modify the existing user-global malformed `http / nuxt-remote` MCP entry. A Codex IDE or CLI restart may be required before the newly configured MCP tools appear in the active session.

## Shared domain vocabulary

Create a `shared/identity/` boundary for values that are safe to import from both client and server code:

```text
shared/identity/
  constants.ts
  types.ts
```

Represent each closed set as an immutable object instead of a TypeScript enum:

```ts
export const ACCOUNT_STATUS = {
  ACTIVE: 'active',
  DISABLED: 'disabled',
} as const

export type AccountStatus =
  typeof ACCOUNT_STATUS[keyof typeof ACCOUNT_STATUS]
```

Apply the same pattern to the existing authentication modes, stable Identity codes, and login identifier kinds. Do not invent role or permission constants before the RBAC slice establishes their approved vocabulary.

Only stable, non-secret vocabulary belongs in `shared`. HTTP status mappings, Better Auth configuration, database details, policy thresholds, secrets, and authorization decisions remain server-only. SQL migrations and the generated Better Auth schema remain self-contained snapshots and may retain literal database values.

## Server module organization

Group the existing module by vertical scenario:

```text
server/modules/identity/
  auth/
    create-auth.ts
    get-auth.ts
    contracts.ts
  bootstrap/
    bootstrap-super-admin.ts
  recovery/
    password-recovery.ts
  session/
    require-session.ts
  sign-in/
    sign-in.ts
    identifier.ts
  identity-error.ts
  rate-limit.ts
```

Scenario-specific files stay together. Cross-scenario server mechanisms remain at the Identity root. Avoid broad barrel exports: consumers should import the capability they use from its explicit module.

Nitro handlers remain thin transport adapters. Business and security rules remain in Identity application services and must not move into client components or route visibility checks.

## Functional design

Use native TypeScript rather than adding an FP framework.

- Keep normalization, identifier classification, rate-limit key construction, and similar transformations pure.
- Model closed vocabulary with immutable object constants and types derived from those objects.
- Pass infrastructure capabilities into service factories rather than resolving databases, clocks, mailers, or Better Auth instances inside domain logic.
- Build runtime dependencies at composition boundaries such as `get-auth.ts` and thin runtime service wrappers.
- Prefer readonly inputs and return new values instead of mutating arguments.
- Use explicit result values only where they simplify pure branching. Do not wrap every asynchronous library call in a custom result abstraction.
- Retain `IdentityError` as an `Error` subclass because Nitro and Better Auth already use exception-based transport boundaries.

The intended shape is a functional core surrounded by a small effectful shell, not class elimination as an end in itself.

## Behavior and security compatibility

The refactor must preserve:

- all current API paths and request/response contracts;
- Better Auth cookies and persistent session behavior;
- generic invalid-credential responses that prevent account enumeration;
- active-account enforcement on the server;
- password-reset expiry, single use, throttling, and session revocation;
- bootstrap idempotency and advisory locking;
- existing stable Identity codes and HTTP statuses;
- the current database schema and migration history.

Shared constants are a vocabulary convenience, not authorization evidence. Future authorization must continue to use server-side permission-code checks as required by the accepted ADRs.

## Testing strategy

Implement in test-driven vertical steps:

1. Add tests for shared object constants, their values, and representative derived-type usage.
2. Add focused unit tests for newly pure functions and dependency-injected factories before moving behavior.
3. Move one Identity scenario at a time and update its consumers.
4. Run the existing unit and PostgreSQL integration suites after each affected slice.
5. Run Nuxt type checking and a production build after all moves.
6. Run the Identity browser suite when PostgreSQL and Mailpit are available.

No migration should be generated. Any schema diff or externally observable authentication change is a regression and must be investigated before completion.

## Documentation and delivery

Record completed slices in `docs/progress.md`. Refresh Tesserae through `./scripts/refresh-tesserae.ps1` after canonical documentation or implementation changes. Do not commit `.tesserae`, generated indexes, `.env`, secrets, or `.output` artifacts.

The existing dirty changes to `.env`, `.output`, `package.json`, `bun.lock`, and `nuxt.config.ts` belong to the user and must be preserved. Commits for this work must stage only files intentionally changed by this refactor.
