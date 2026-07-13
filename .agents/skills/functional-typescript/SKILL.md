---
name: functional-typescript
description: Use when designing or refactoring TypeScript code with hidden dependencies, mixed pure logic and effects, repeated closed-set literals, mutation, or exception-heavy domain branching.
---

# Functional TypeScript

## Core principle

Make business transformations pure and deterministic. Push I/O, time, randomness, and framework integration to a small runtime composition boundary without forcing a functional-programming framework.

## Workflow

1. Write behavior tests first and watch them fail for the expected reason.
2. Identify effects and mutable state in the target behavior.
3. Establish contextual types on containers, parameters, and return values; let literals be checked without assertions and narrow nullable or unknown values before use.
4. Extract pure deterministic transformations: explicit inputs, immutable outputs, no I/O or ambient state.
5. Represent repeated closed sets with an `as const` object and a derived union.
6. Inject only the narrow capabilities the use case needs; compose concrete adapters at runtime.
7. Introduce a discriminated `Result` selectively when expected domain outcomes otherwise require exception-heavy branching. Retain framework-compatible `Error` objects for unexpected failures and framework error hooks.
8. Re-run the focused tests, then the relevant suite. Do not add `fp-ts`, Effect, or another functional library unless the project already justifies it.

## Compact example

```ts
const InviteFailure = {
  Duplicate: 'duplicate',
  InvalidEmail: 'invalid_email',
} as const

type InviteFailure = typeof InviteFailure[keyof typeof InviteFailure]
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }
type Invite = Readonly<{ email: string; createdAtEpochMs: number }>

const normalizeEmail = (value: string) => value.trim().toLowerCase()

const createInvite = (email: string, createdAtEpochMs: number): Result<Invite, InviteFailure> => {
  const normalized = normalizeEmail(email)
  return normalized.includes('@')
    ? { ok: true, value: { email: normalized, createdAtEpochMs } }
    : { ok: false, error: InviteFailure.InvalidEmail }
}

type InviteCapabilities = {
  exists(email: string): Promise<boolean>
  save(invite: Invite): Promise<void>
  now: () => number
}

export const inviteUser = (deps: InviteCapabilities) => async (email: string) => {
  const candidate = createInvite(email, deps.now())
  if (!candidate.ok || await deps.exists(candidate.value.email))
    return candidate.ok ? { ok: false, error: InviteFailure.Duplicate } as const : candidate
  await deps.save(candidate.value)
  return candidate
}
```

## Quick reference

| Smell | Refactoring |
|---|---|
| Environment, clock, database, or globals read inside logic | Inject a narrow capability |
| Calculation interleaved with I/O | Extract a pure function; orchestrate effects outside |
| Repeated string literals | Use an `as const` object and derive its union |
| `null`, `[]`, or `{}` forced with `as T` | Contextually type the enclosing object or function |
| Non-null assertion (`value!`) | Guard the value and let control-flow analysis narrow it |
| In-place updates | Return immutable values with `map`, spread, or copying |
| Expected domain cases thrown and caught | Use a discriminated `Result` at that boundary |
| Unexpected infrastructure/framework failure | Preserve or wrap as a framework-compatible `Error` |

## Common mistakes

- Do not turn every function into a `Result`; use it for expected alternatives that callers must branch on.
- Do not inject a large service container; define the smallest capability-shaped interface.
- Do not hide effects behind helpers named like pure transformations.
- Do not use `as T` to hide a type mismatch or `!` to bypass nullability. Keep `as const` for literal preservation. At untyped external boundaries, validate first; keep any unavoidable assertion local and explain why it is safe.
- Do not replace clear loops with dense pipelines merely to appear functional.
- Do not add `fp-ts` or Effect without an existing project-level reason.
- Never put secrets, database access, or authorization decisions in client-shared modules. Keep them server-side; authorization must use server-verified permissions.
