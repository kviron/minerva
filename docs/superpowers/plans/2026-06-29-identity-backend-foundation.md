# Identity Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver PostgreSQL-backed Better Auth login by email or username, persistent sessions, logout, Mailpit password recovery, and safe first-`super_admin` bootstrap without redesigning the existing pages.

**Architecture:** Keep Identity inside the Nuxt/Nitro modular monolith. Drizzle owns one PostgreSQL schema and migration history; Better Auth uses the official Drizzle adapter; thin Nitro handlers call focused Identity services and server-side session guards. Existing Vue forms receive behavior only.

The existing authentication forms keep their approved structure and styling; this plan changes only validation, submission state, errors, and navigation behavior.

**Tech Stack:** Nuxt 4.4.8, Nitro/H3, Vue 3.5, Bun 1.3, PostgreSQL 17, Drizzle ORM 0.45.2, Better Auth 1.6.22, Mailpit 1.30.0, Vitest 4.1.9, Playwright 1.61.1

---

## File map

- `shared/config/env.ts`: parse and validate server-only configuration.
- `server/infrastructure/database/{client,health}.ts`: lazy PostgreSQL/Drizzle access and readiness.
- `server/infrastructure/database/schema/auth.ts`: Better Auth-generated schema plus reviewed indexes.
- `server/infrastructure/mail/smtp-password-reset-mailer.ts`: SMTP implementation of the reset-mail contract.
- `server/modules/identity/`: Better Auth factory, runtime instance, domain errors, identifier classification, rate limiting, sign-in, recovery, bootstrap, and session guard.
- `server/api/auth/[...all].ts`: Better Auth transport, with Minerva-owned flows blocked from direct bypass.
- `server/api/identity/*.post.ts`: stable Minerva identity HTTP contract.
- `app/lib/auth-client.ts`, `app/middleware/auth.global.ts`: session client and page protection.
- Existing `app/components/auth/*`: state and submission wiring only; no layout redesign.
- `tests/unit`, `tests/integration`, `tests/e2e`: fast rules, real PostgreSQL/auth behavior, and browser journeys.

The following signatures are fixed for every task:

```ts
export type AuthMode = 'runtime' | 'bootstrap' | 'test-seed'
export type IdentityCode = 'INVALID_CREDENTIALS' | 'AUTH_REQUIRED' | 'ACCOUNT_DISABLED'
  | 'RESET_REQUEST_ACCEPTED' | 'RESET_TOKEN_INVALID' | 'RATE_LIMITED' | 'SERVICE_UNAVAILABLE'
  | 'BOOTSTRAP_ALREADY_COMPLETE' | 'BOOTSTRAP_IDENTITY_CONFLICT'
export type LoginIdentifier = { kind: 'email' | 'username', normalized: string }
export interface PasswordResetMailer {
  sendPasswordReset(input: { to: string, resetUrl: string }): Promise<void>
}
export interface CreateMinervaAuthInput {
  mode: AuthMode
  db: import('drizzle-orm/postgres-js').PostgresJsDatabase
  baseURL: string
  trustedOrigins: string[]
  mailer: PasswordResetMailer
}
export interface RateLimitInput {
  scope: 'sign-in' | 'recovery-request' | 'password-reset'
  ip: string
  identity?: string
  max: number
  windowSeconds: number
}
export interface SignInInput { identifier: string, password: string, ip: string, requestHeaders: Headers }
export interface BootstrapInput { email: string, username: string, password: string }
export interface RecoveryRequest { email: string, ip: string }
export interface ResetRequest { token: string, newPassword: string, ip: string }
export function classifyLoginIdentifier(value: string): LoginIdentifier
export function createMinervaAuth(input: CreateMinervaAuthInput): ReturnType<typeof betterAuth>
export function consumeIdentityRateLimit(input: RateLimitInput): Promise<void>
export function signInWithIdentifier(input: SignInInput): Promise<{ headers: Headers }>
export function bootstrapSuperAdmin(input: BootstrapInput): Promise<{ outcome: 'created' | 'existing', userId: string }>
export function requestPasswordReset(input: RecoveryRequest): Promise<'RESET_REQUEST_ACCEPTED'>
export function resetPassword(input: ResetRequest): Promise<void>
export function requireSession(event: H3Event): Promise<NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>>
```

After every task commit, run `./scripts/refresh-tesserae.ps1` and verify that no `.tesserae` path is staged. Generated Tesserae state remains local and is never included in a feature commit.

### Task 1: Add exact dependencies, checks, and validated environment

**Files:**
- Modify: `package.json`
- Modify: `bun.lock`
- Modify: `.gitignore`
- Create: `.env.example`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `shared/config/env.ts`
- Create: `tests/unit/config/env.spec.ts`

- [ ] **Step 1: Install exact dependencies**

Run:

```powershell
bun add --exact better-auth@1.6.22 @better-auth/drizzle-adapter@1.6.22 drizzle-orm@0.45.2 postgres@3.4.9 nodemailer@8.0.11
bun add --dev --exact drizzle-kit@0.31.10 @types/nodemailer@8.0.1 vitest@4.1.9 @vitest/coverage-v8@4.1.9 @nuxt/test-utils@4.0.3 @playwright/test@1.61.1 vue-tsc@3.3.5
```

Expected: `package.json` and `bun.lock` change; no application files change.

- [ ] **Step 2: Add the failing environment tests**

Create `tests/unit/config/env.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { parseServerEnv } from '../../../shared/config/env'

const valid = {
  DATABASE_URL: 'postgresql://minerva:minerva@127.0.0.1:5432/minerva',
  BETTER_AUTH_SECRET: '01234567890123456789012345678901',
  BETTER_AUTH_URL: 'http://127.0.0.1:3000',
  TRUSTED_ORIGINS: 'http://127.0.0.1:3000,http://localhost:3000',
  RATE_LIMIT_HMAC_SECRET: 'abcdefghijklmnopqrstuvwxyz123456',
  SMTP_HOST: '127.0.0.1', SMTP_PORT: '1025',
  MAIL_FROM: 'Minerva <no-reply@minerva.local>',
  MAILPIT_API_URL: 'http://127.0.0.1:8025',
}

describe('parseServerEnv', () => {
  it('parses trusted origins and numeric SMTP port', () => {
    const env = parseServerEnv(valid)
    expect(env.TRUSTED_ORIGINS).toEqual(['http://127.0.0.1:3000', 'http://localhost:3000'])
    expect(env.SMTP_PORT).toBe(1025)
  })

  it('rejects short secrets', () => {
    expect(() => parseServerEnv({ ...valid, BETTER_AUTH_SECRET: 'short' })).toThrow()
  })
})
```

- [ ] **Step 3: Configure Vitest and verify RED**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.spec.ts', 'tests/integration/**/*.spec.ts'],
    fileParallelism: false,
    coverage: { provider: 'v8', reporter: ['text', 'json'] },
  },
})
```

Run:

```powershell
bunx vitest run tests/unit/config/env.spec.ts
```

Expected: FAIL because `shared/config/env.ts` does not exist.

- [ ] **Step 4: Implement environment parsing**

Create `shared/config/env.ts`:

```ts
import { z } from 'zod'

const schema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  TRUSTED_ORIGINS: z.string().transform(value => value.split(',').map(v => v.trim()).filter(Boolean)),
  RATE_LIMIT_HMAC_SECRET: z.string().min(32),
  TRUST_PROXY: z.enum(['true', 'false']).default('false').transform(v => v === 'true'),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535),
  MAIL_FROM: z.string().min(3),
  MAILPIT_API_URL: z.string().url(),
})

export type ServerEnv = z.infer<typeof schema>
export const parseServerEnv = (input: Record<string, string | undefined>) => schema.parse(input)
let cached: ServerEnv | undefined
export const getServerEnv = () => cached ??= parseServerEnv(process.env)
```

Document non-secret local values in `.env.example`; add `.env`, `.output`, `coverage`, `playwright-report`, and `test-results` to `.gitignore`. Do not read or copy the existing `.env`.

- [ ] **Step 5: Add scripts and browser config**

Add these `package.json` scripts:

```json
{
  "typecheck": "nuxt typecheck",
  "test:unit": "vitest run tests/unit",
  "test:integration": "vitest run tests/integration",
  "test:e2e": "playwright test",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "auth:bootstrap": "bun scripts/bootstrap-super-admin.ts"
}
```

Create `playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://127.0.0.1:3000', trace: 'retain-on-failure' },
  webServer: {
    command: 'bun run dev --host 127.0.0.1',
    url: 'http://127.0.0.1:3000/api/health/database',
    reuseExistingServer: false,
    env: {
      ...process.env,
      DATABASE_URL: 'postgresql://minerva:minerva@127.0.0.1:5433/minerva_test',
      BETTER_AUTH_SECRET: 'test-secret-012345678901234567890',
      BETTER_AUTH_URL: 'http://127.0.0.1:3000',
      TRUSTED_ORIGINS: 'http://127.0.0.1:3000',
      RATE_LIMIT_HMAC_SECRET: 'test-rate-limit-secret-01234567890',
      SMTP_HOST: '127.0.0.1', SMTP_PORT: '1025',
      MAIL_FROM: 'Minerva <no-reply@minerva.local>',
      MAILPIT_API_URL: 'http://127.0.0.1:8025',
    },
  },
})
```

- [ ] **Step 6: Verify GREEN and commit**

Run `bun run test:unit` and `bun run typecheck`. Expected: both exit 0.

```powershell
git add package.json bun.lock .gitignore .env.example vitest.config.ts playwright.config.ts shared/config tests/unit/config
git commit -m "chore: add identity backend test foundation"
```

### Task 2: Add Mailpit, isolated test PostgreSQL, and database readiness

**Files:**
- Modify: `docker-compose.yml`
- Create: `drizzle.config.ts`
- Create: `server/infrastructure/database/client.ts`
- Create: `server/infrastructure/database/health.ts`
- Create: `server/api/health/database.get.ts`
- Create: `tests/helpers/database.ts`
- Create: `tests/integration/database/health.spec.ts`

- [ ] **Step 1: Extend Compose**

Keep the existing `postgres` service and add:

```yaml
  postgres-test:
    image: postgres:17-alpine
    profiles: [test]
    environment:
      POSTGRES_DB: minerva_test
      POSTGRES_USER: minerva
      POSTGRES_PASSWORD: minerva
    ports: ["127.0.0.1:5433:5432"]
    tmpfs: [/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U minerva -d minerva_test"]
      interval: 2s
      timeout: 3s
      retries: 15

  mailpit:
    image: axllent/mailpit:v1.30.0
    ports:
      - "127.0.0.1:1025:1025"
      - "127.0.0.1:8025:8025"
```

- [ ] **Step 2: Write the failing database readiness test**

Create `tests/integration/database/health.spec.ts`:

```ts
import { expect, it } from 'vitest'
import { checkDatabase } from '../../../server/infrastructure/database/health'

it('reports a real PostgreSQL connection as ready', async () => {
  await expect(checkDatabase('postgresql://minerva:minerva@127.0.0.1:5433/minerva_test'))
    .resolves.toEqual({ database: 'ok' })
})
```

Run:

```powershell
docker compose --profile test up -d --wait postgres-test mailpit
bunx vitest run tests/integration/database/health.spec.ts
```

Expected: FAIL because `health.ts` does not exist.

- [ ] **Step 3: Implement the database boundary**

`client.ts` exports `createDatabase(url)` using `postgres(url, { max: 10 })` and `drizzle(queryClient)`, plus lazy `getDatabase()` and `closeDatabase()`. Implement `health.ts` as:

```ts
import postgres from 'postgres'

export async function checkDatabase(url: string) {
  const sql = postgres(url, { max: 1 })
  try {
    await sql`select 1`
    return { database: 'ok' as const }
  } finally {
    await sql.end()
  }
}
```

The Nitro endpoint maps connection failure to `503 SERVICE_UNAVAILABLE` without returning the connection error.

Create `drizzle.config.ts`:

```ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './server/infrastructure/database/schema/auth.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL! },
})
```

- [ ] **Step 4: Verify and commit**

Run the focused integration test and `bun run typecheck`. Expected: PASS.

```powershell
git add docker-compose.yml drizzle.config.ts server/infrastructure/database server/api/health tests/helpers tests/integration/database
git commit -m "feat: add database and mail development services"
```

### Task 3: Configure Better Auth and generate the first migration

**Files:**
- Create: `server/modules/identity/contracts.ts`
- Create: `server/modules/identity/create-auth.ts`
- Create: `server/modules/identity/auth.ts`
- Create: `server/infrastructure/mail/smtp-password-reset-mailer.ts`
- Create: `server/infrastructure/database/schema/auth.ts`
- Create: `server/infrastructure/database/schema/index.ts`
- Create: `drizzle/0000_identity_backend_foundation.sql`
- Create: `drizzle/meta/0000_snapshot.json`
- Create: `drizzle/meta/_journal.json`
- Create: `tests/integration/identity/schema.spec.ts`

- [ ] **Step 1: Write the failing schema test**

Reset the test database `public` schema in `tests/helpers/database.ts`, run Drizzle migrations, then query `information_schema.tables`. Expect `user`, `account`, `session`, `verification`, and `rateLimit`.

Run the test. Expected: FAIL because no migration exists.

- [ ] **Step 2: Create the auth factory used for schema generation**

Define `PasswordResetMailer` in `contracts.ts`. Implement `createMinervaAuth` with:

```ts
betterAuth({
  baseURL, trustedOrigins,
  database: drizzleAdapter(db, { provider: 'pg' }),
  advanced: { database: { generateId: 'uuid' } },
  emailAndPassword: {
    enabled: true,
    disableSignUp: mode === 'runtime',
    autoSignIn: false,
    minPasswordLength: 12,
    maxPasswordLength: 256,
    resetPasswordTokenExpiresIn: 1800,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: ({ user, token }) => void mailer.sendPasswordReset({
      to: user.email,
      resetUrl: `${baseURL}/auth/reset-password/${encodeURIComponent(token)}`,
    }),
  },
  verification: { storeIdentifier: 'hashed' },
  session: { expiresIn: 604800, updateAge: 86400 },
  user: { additionalFields: {
    superAdmin: { type: 'boolean', defaultValue: false, input: false },
    status: { type: ['active', 'disabled'], defaultValue: 'active', input: false },
    disabledAt: { type: 'date', required: false, input: false },
    disabledReason: { type: 'string', required: false, input: false },
    lastLoginAt: { type: 'date', required: false, input: false },
  } },
  disabledPaths: ['/is-username-available'],
  rateLimit: { enabled: true, storage: 'database' },
  plugins: [username()],
})
```

Modes are exactly `'runtime' | 'bootstrap' | 'test-seed'`; only runtime disables signup and only bootstrap sets `superAdmin` in a `databaseHooks.user.create.before` hook.
The runtime configuration must make public sign-up unavailable; bootstrap and test seeding are server-only processes and are never mounted as public transports.

Create the SMTP mailer in this task so runtime `auth.ts` has no temporary dependency. It constructs a Nodemailer transport from validated SMTP host/port and implements `PasswordResetMailer`; sending behavior is exercised in Task 6.

- [ ] **Step 3: Generate and review the schema**

Run:

```powershell
bunx auth@1.6.22 generate --config server/modules/identity/auth.ts --output server/infrastructure/database/schema/auth.ts --yes
bun run db:generate -- --name identity_backend_foundation
```

Expected: the five tables and username/user fields are present; primary keys use UUID-compatible string values; email, username, session token, and rate-limit key have unique indexes. Export every table through `schema/index.ts` and pass the schema object to `drizzleAdapter`.

- [ ] **Step 4: Add session lifecycle hooks**

Add `databaseHooks.session.create.before` to reject any user whose status is not `active` with generic `INVALID_CREDENTIALS`. Add `session.create.after` to update only `lastLoginAt`. Do not log the identifier, password, hash, session token, or reset token.

- [ ] **Step 5: Verify migration and commit**

Run the schema integration test twice from a reset test database, then `bun run typecheck`. Expected: both migration runs and typecheck pass.

```powershell
git add server/modules/identity server/infrastructure/database/schema drizzle tests/integration/identity/schema.spec.ts
git commit -m "feat: add Better Auth database schema"
```

### Task 4: Add safe first-super-admin bootstrap

**Files:**
- Create: `server/modules/identity/bootstrap-super-admin.ts`
- Create: `scripts/read-hidden-value.ts`
- Create: `scripts/bootstrap-super-admin.ts`
- Create: `tests/integration/identity/bootstrap-super-admin.spec.ts`

- [ ] **Step 1: Write RED bootstrap cases**

Create four named tests: `creates the first active super admin`, `is idempotent for the same normalized identity`, `refuses a second bootstrap identity`, and `never elevates an existing ordinary account`. Run:

```powershell
bunx vitest run tests/integration/identity/bootstrap-super-admin.spec.ts
```

Expected: FAIL because `bootstrapSuperAdmin` does not exist.

- [ ] **Step 2: Implement bootstrap service**

Use a dedicated one-connection PostgreSQL client, acquire `pg_advisory_lock(hashtext('minerva-bootstrap-super-admin'))`, perform all checks, call a `bootstrap`-mode Better Auth `auth.api.signUpEmail` with username/displayUsername, and release the lock in `finally`. Return only `{ outcome: 'created' | 'existing', userId }`.

- [ ] **Step 3: Implement protected CLI input**

`read-hidden-value.ts` reads a TTY password with raw-mode keypress handling and restores terminal mode in `finally`. The command accepts no password argument, prints neither password nor email, and emits only `Bootstrap super administrator is ready.` on success.

- [ ] **Step 4: Verify and commit**

Run focused tests twice and confirm no password appears in captured stdout/stderr.

```powershell
git add server/modules/identity/bootstrap-super-admin.ts scripts tests/integration/identity/bootstrap-super-admin.spec.ts package.json
git commit -m "feat: add super admin bootstrap command"
```

### Task 5: Add identifier login, durable throttling, and session guard

**Files:**
- Create: `server/modules/identity/errors.ts`
- Create: `server/modules/identity/identifier.ts`
- Create: `server/modules/identity/rate-limit.ts`
- Create: `server/modules/identity/sign-in.ts`
- Create: `server/modules/identity/require-session.ts`
- Create: `server/api/auth/[...all].ts`
- Create: `server/api/identity/sign-in.post.ts`
- Modify: `server/api/mainMenu.get.ts`
- Create: `tests/unit/identity/identifier.spec.ts`
- Create: `tests/integration/identity/sign-in.spec.ts`

- [ ] **Step 1: Write RED identifier tests**

Create `identifier.spec.ts` with exact cases ` User@Example.com ` → `{ kind: 'email', normalized: 'user@example.com' }`, ` Test.User ` → `{ kind: 'username', normalized: 'test.user' }`, and empty or 256-character input → `INVALID_CREDENTIALS`. Run the file and expect module-not-found RED.

- [ ] **Step 2: Implement identifier and stable errors**

`identifier.ts` returns `{ kind: 'email' | 'username', normalized: string }`. `errors.ts` defines only `INVALID_CREDENTIALS`, `AUTH_REQUIRED`, `ACCOUNT_DISABLED`, `RESET_REQUEST_ACCEPTED`, `RESET_TOKEN_INVALID`, `RATE_LIMITED`, and `SERVICE_UNAVAILABLE`, each with an HTTP status mapping.

- [ ] **Step 3: Write RED throttling/sign-in integration tests**

Seed one user through `test-seed` mode. Add named tests for email cookie, username cookie, shared invalid-credential response, sixth-attempt `429`, and absence of plaintext identifier in `rateLimit`. Run `bunx vitest run tests/integration/identity/sign-in.spec.ts`; expected: RED because `sign-in.ts` is missing.

- [ ] **Step 4: Implement durable rate limiting and sign-in**

Hash `${scope}:${ip}:${normalizedIdentifier}` with HMAC-SHA-256 and `RATE_LIMIT_HMAC_SECRET`. Atomically insert/update `rateLimit`; reset count outside the window; reject when count exceeds five. `sign-in.ts` branches to `auth.api.signInEmail` or `auth.api.signInUsername` with `returnHeaders: true`, catches Better Auth `APIError`, and always maps credential failure to `INVALID_CREDENTIALS`.

The Nitro handler obtains the connecting IP with `getRequestIP(event, { xForwardedFor: env.TRUST_PROXY })`, forwards every `Set-Cookie` value, and returns `{ ok: true }` only.

- [ ] **Step 5: Mount Better Auth and protect a server API**

The catch-all handler delegates to `auth.handler(toWebRequest(event))` but returns `404` for direct sign-up, username-availability, email/username sign-in, request-reset, and reset paths owned by Minerva adapters. `require-session.ts` calls `auth.api.getSession({ headers: event.headers })` and throws `AUTH_REQUIRED`. Replace role-name logic in `mainMenu.get.ts` with this server session guard.

- [ ] **Step 6: Verify and commit**

Run unit/integration tests and typecheck.

```powershell
git add server/modules/identity server/api tests/unit/identity tests/integration/identity/sign-in.spec.ts
git commit -m "feat: add secure identifier sign in"
```

### Task 6: Add Mailpit password recovery and reset

**Files:**
- Modify: `server/infrastructure/mail/smtp-password-reset-mailer.ts`
- Create: `server/modules/identity/password-recovery.ts`
- Create: `server/api/identity/request-password-reset.post.ts`
- Create: `server/api/identity/reset-password.post.ts`
- Create: `tests/integration/identity/password-recovery.spec.ts`

- [ ] **Step 1: Write RED recovery tests**

Add named tests for the shared request response, known-account Mailpit delivery, no unknown-account mail, 30-minute expiry, single use, and session revocation. Fetch mail text from `${MAILPIT_API_URL}/view/latest.txt?query=to:<encoded-email>`. Run the file; expected: RED because `password-recovery.ts` is missing.

- [ ] **Step 2: Implement SMTP adapter**

Use Nodemailer transport `{ host, port, secure: false }`. Send Russian subject `Восстановление пароля Minerva` and plain-text link. Catch asynchronous send failure with a sanitized server error that excludes recipient and URL.

- [ ] **Step 3: Implement recovery services and handlers**

Request endpoint uses a three-per-hour HMAC key of IP plus normalized email, calls `auth.api.requestPasswordReset`, and always returns `{ code: 'RESET_REQUEST_ACCEPTED' }`. Reset endpoint limits five attempts per 15 minutes per IP, calls `auth.api.resetPassword`, and maps invalid/expired/used tokens to `RESET_TOKEN_INVALID`.

- [ ] **Step 4: Verify and commit**

Run Mailpit integration tests, sign-in regression tests, and typecheck.

```powershell
git add server/infrastructure/mail server/modules/identity/password-recovery.ts server/api/identity tests/integration/identity/password-recovery.spec.ts
git commit -m "feat: add password recovery through Mailpit"
```

### Task 7: Wire existing forms and protect pages without redesign

**Files:**
- Create: `app/lib/auth-client.ts`
- Create: `app/middleware/auth.global.ts`
- Modify: `app/components/auth/loginForm/index.vue`
- Modify: `app/components/auth/forgotPasswordForm/index.vue`
- Modify: `app/components/auth/resetPasswordForm/index.vue`
- Modify: `app/pages/auth/reset-password/[token].vue`
- Modify: `playwright.config.ts`
- Create: `tests/e2e/global.setup.ts`
- Create: `tests/e2e/identity.spec.ts`

- [ ] **Step 1: Add RED browser journeys**

Create seven Playwright tests named `redirects a guest`, `signs in by email`, `signs in by username`, `hides credential enumeration`, `revokes logout session`, `returns one recovery response`, and `resets once through Mailpit`. Run them before UI wiring; expected: failures at missing identity endpoints or absent form state.

`global.setup.ts` resets the test schema, applies `drizzle/`, clears Mailpit with its API, and creates one ordinary user through `test-seed` mode. Register it as `globalSetup` in `playwright.config.ts`; never call the interactive bootstrap command from tests.

- [ ] **Step 2: Add auth client and page middleware**

Create:

```ts
// app/lib/auth-client.ts
import { createAuthClient } from 'better-auth/vue'
export const authClient = createAuthClient({ baseURL: '/api/auth' })
```

The global middleware allows `/auth/**`, `/legal/**`, and `/invitations/**`; all other routes require `authClient.getSession()`. Authenticated visits to `/auth` redirect to `/`.

- [ ] **Step 3: Wire the login form**

Keep all existing classes and structure. Add `v-model` identifier/password refs, `autocomplete="username"` and `autocomplete="current-password"`, submit through `$fetch('/api/identity/sign-in')`, disable the button while pending, display `Неверный логин или пароль` for `INVALID_CREDENTIALS`, then navigate to `/`.

- [ ] **Step 4: Wire recovery forms**

Forgot form posts email and always displays `Если аккаунт существует, ссылка отправлена на почту`. Reset form validates matching 12–256-character passwords, reads the path token from `route.params.token`, posts `{ token, newPassword }`, and returns to `/auth` after success. Replace the incorrect `<ResetPasswordForm />` usage with `<AuthResetPasswordForm />`.

- [ ] **Step 5: Verify logout without adding layout UI**

Use Better Auth `POST /api/auth/sign-out` in the browser test, then reload `/` and expect redirect to `/auth`. This proves the server behavior while avoiding conflicts with the separately edited header/sidebar; a visible logout control belongs to the later approved UI slice.

- [ ] **Step 6: Verify and commit**

Run `bun run test:e2e`, unit/integration tests, typecheck, and build.

```powershell
git add app/lib app/middleware app/components/auth app/pages/auth tests/e2e playwright.config.ts
git commit -m "feat: connect authentication forms"
```

### Task 8: Complete documentation and final verification

**Files:**
- Modify: `docs/progress.md`
- Modify: `docs/superpowers/specs/2026-06-28-identity-backend-foundation-design.md`
- Modify: `docs/superpowers/plans/2026-06-29-identity-backend-foundation.md`

- [ ] **Step 1: Verify from clean infrastructure**

Run:

```powershell
docker compose down
docker compose --profile test up -d --wait postgres postgres-test mailpit
bun install --frozen-lockfile
bun run db:migrate
bun run test:unit
bun run test:integration
bun run test:e2e
bun run typecheck
bun run build
git diff --check
```

Expected: every command exits 0; a repeated `bun run db:migrate` makes no schema change.

- [ ] **Step 2: Record the completed slice**

Set the design status to `implemented and verified`, check completed plan boxes, and add one concise `docs/progress.md` entry covering PostgreSQL/Drizzle, Better Auth identifier login, sessions/logout, Mailpit recovery, bootstrap, and verification evidence.

- [ ] **Step 3: Refresh Tesserae safely**

Run `./scripts/refresh-tesserae.ps1`. Verify success, then confirm `.tesserae`, `.env`, `.output`, Mailpit data, and database files are not staged.

- [ ] **Step 4: Final documentation commit**

```powershell
git add docs/progress.md docs/superpowers/specs/2026-06-28-identity-backend-foundation-design.md docs/superpowers/plans/2026-06-29-identity-backend-foundation.md
git commit -m "docs: complete identity backend foundation"
git status --short
```

Expected: no source/document changes remain unstaged; `.tesserae` may contain local generated refresh state but no Tesserae path, secret, environment file, or build output is committed.
