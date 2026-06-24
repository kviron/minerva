# Minerva Executable Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a reproducible Nuxt 4 foundation with bilingual SSR routes, theme support, PostgreSQL/Drizzle, MinIO, automated checks, and CI without implementing product features.

**Architecture:** Use Nuxt as the single application and Nitro server. Keep infrastructure adapters under `server/infrastructure`, shared configuration validation under `shared`, and UI shell code under `app`. This slice proves the runtime, database, storage, localization, and testing seams used by every later slice.

**Tech Stack:** Node.js 22.23.1 LTS, pnpm 11.8.0, Nuxt 4.4.8, Vue 3, TypeScript, Tailwind CSS, shadcn-vue, `@nuxtjs/i18n`, `@nuxtjs/color-mode`, PostgreSQL, Drizzle ORM, MinIO, Vitest, Playwright, ESLint, Docker Compose.

All package versions are exact in `package.json` and `pnpm-lock.yaml`. `.npmrc` sets `save-exact=true`. Dependency upgrades are separate reviewed tasks and never occur implicitly while implementing this plan.

---

### Task 1: Pin the toolchain and scaffold Nuxt

**Files:**
- Create: `.nvmrc`
- Create: `.npmrc`
- Create: `package.json`
- Create: `pnpm-lock.yaml`
- Create: `pnpm-workspace.yaml`
- Create: `nuxt.config.ts`
- Create: `tsconfig.json`
- Create: `app/app.vue`
- Create: `app/pages/index.vue`
- Create: `public/favicon.ico`

- [ ] **Step 1: Add the toolchain pin**

Create `.nvmrc`:

```text
22.23.1
```

Create `.npmrc`:

```ini
save-exact=true
```

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - .
```

- [ ] **Step 2: Create the minimal Nuxt foundation manually**

Create `package.json` with the exact package-manager and Nuxt versions:

```json
{
  "name": "minerva",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@11.8.0",
  "engines": {
    "node": "22.23.1",
    "pnpm": "11.8.0"
  },
  "dependencies": {
    "nuxt": "4.4.8"
  }
}
```

Create the listed minimal `nuxt.config.ts`, `tsconfig.json`, `app/app.vue`, `app/pages/index.vue`, and public files directly. Do not run a project generator in the repository root and do not use `--force`.

Activate the pinned package manager:

```powershell
corepack enable
corepack prepare pnpm@11.8.0 --activate
pnpm install --frozen-lockfile=false
```

Expected: the minimal Nuxt application installs without modifying `AGENTS.md` or existing documentation.

- [ ] **Step 3: Normalize scripts**

Set `package.json` scripts to:

```json
{
  "scripts": {
    "build": "nuxt build",
    "dev": "nuxt dev",
    "preview": "nuxt preview",
    "postinstall": "nuxt prepare",
    "typecheck": "nuxt typecheck",
    "lint": "eslint .",
    "test:unit": "vitest run",
    "test:e2e": "playwright test",
    "test": "pnpm test:unit && pnpm test:e2e"
  }
}
```

- [ ] **Step 4: Verify the empty application**

Run:

```powershell
pnpm install --frozen-lockfile=false
pnpm typecheck
pnpm build
```

Expected: both commands exit successfully.

- [ ] **Step 5: Commit**

```powershell
git add .nvmrc .npmrc package.json pnpm-lock.yaml pnpm-workspace.yaml nuxt.config.ts tsconfig.json app public
git commit -m "chore: scaffold Nuxt foundation"
```

### Task 2: Add unit, browser, and lint harnesses

**Files:**
- Create: `eslint.config.mjs`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `tests/unit/smoke.spec.ts`
- Create: `tests/e2e/app-shell.spec.ts`

- [ ] **Step 1: Write the failing unit smoke test**

Create `tests/unit/smoke.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'

describe('test harness', () => {
  it('runs TypeScript tests', () => {
    expect('minerva').toBe('minerva')
  })
})
```

- [ ] **Step 2: Install and configure test dependencies**

Run:

```powershell
pnpm add --save-exact -D vitest @vitest/coverage-v8 @playwright/test eslint @nuxt/eslint
pnpm exec playwright install chromium
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})
```

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm dev --host 127.0.0.1',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
```

- [ ] **Step 3: Add the browser smoke test**

Create `tests/e2e/app-shell.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test('renders the Minerva shell', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Minerva/)
  await expect(page.getByRole('heading', { name: 'Minerva' })).toBeVisible()
})
```

- [ ] **Step 4: Run checks**

Run:

```powershell
pnpm lint
pnpm test:unit
pnpm test:e2e
```

Expected: all checks pass.

- [ ] **Step 5: Commit**

```powershell
git add eslint.config.mjs vitest.config.ts playwright.config.ts tests package.json pnpm-lock.yaml
git commit -m "test: add foundation quality gates"
```

### Task 3: Add Russian-first localization and themes

**Files:**
- Create: `i18n/locales/ru.json`
- Create: `i18n/locales/en.json`
- Create: `i18n/i18n.config.ts`
- Create: `app/components/LocaleSwitcher.vue`
- Create: `app/components/ThemeSwitcher.vue`
- Modify: `app/app.vue`
- Modify: `app/pages/index.vue`
- Modify: `nuxt.config.ts`
- Modify: `tests/e2e/app-shell.spec.ts`

- [ ] **Step 1: Extend the failing browser test**

Add:

```ts
test('uses Russian by default and English under /en', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Проекты и документация' })).toBeVisible()

  await page.goto('/en')
  await expect(page.getByRole('heading', { name: 'Projects and documentation' })).toBeVisible()
})
```

- [ ] **Step 2: Verify the new test fails**

Run:

```powershell
pnpm test:e2e --grep "uses Russian"
```

Expected: FAIL because localized routes and messages do not exist.

- [ ] **Step 3: Install localization, theme, and UI dependencies**

Run:

```powershell
pnpm add --save-exact @nuxtjs/i18n @nuxtjs/color-mode
pnpm add --save-exact -D tailwindcss @tailwindcss/vite
pnpm dlx shadcn-vue@latest init
```

Configure `nuxt.config.ts` with:

```ts
export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n', '@nuxtjs/color-mode'],
  i18n: {
    defaultLocale: 'ru',
    strategy: 'prefix_except_default',
    langDir: 'locales',
    locales: [
      { code: 'ru', language: 'ru-RU', file: 'ru.json', name: 'Русский' },
      { code: 'en', language: 'en-US', file: 'en.json', name: 'English' },
    ],
  },
  colorMode: {
    classSuffix: '',
    preference: 'system',
    fallback: 'light',
  },
})
```

Create translation files with matching keys:

```json
{
  "app": {
    "name": "Minerva",
    "tagline": "Проекты и документация"
  }
}
```

```json
{
  "app": {
    "name": "Minerva",
    "tagline": "Projects and documentation"
  }
}
```

- [ ] **Step 4: Implement the localized shell**

Render `app.name` and `app.tagline` through `$t`, use locale-aware links, and add shadcn-vue controls for locale and color mode. Do not hard-code user-visible labels in Vue templates.

- [ ] **Step 5: Run checks**

Run:

```powershell
pnpm typecheck
pnpm lint
pnpm test:e2e
```

Expected: Russian default and `/en` tests pass without hydration warnings.

- [ ] **Step 6: Commit**

```powershell
git add nuxt.config.ts i18n app components.json package.json pnpm-lock.yaml tests/e2e
git commit -m "feat: add bilingual themed app shell"
```

### Task 4: Add validated runtime configuration

**Files:**
- Create: `.env.example`
- Create: `shared/config/env.ts`
- Create: `tests/unit/config/env.spec.ts`
- Modify: `nuxt.config.ts`

- [ ] **Step 1: Write the failing environment tests**

Create `tests/unit/config/env.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { parseServerEnv } from '../../../shared/config/env'

describe('parseServerEnv', () => {
  it('accepts valid infrastructure URLs', () => {
    expect(parseServerEnv({
      DATABASE_URL: 'postgresql://minerva:minerva@localhost:5432/minerva',
      S3_ENDPOINT: 'http://localhost:9000',
      S3_BUCKET: 'minerva',
      S3_ACCESS_KEY: 'minerva',
      S3_SECRET_KEY: 'minerva-secret',
      BETTER_AUTH_SECRET: '01234567890123456789012345678901',
    }).S3_BUCKET).toBe('minerva')
  })

  it('rejects a missing auth secret', () => {
    expect(() => parseServerEnv({})).toThrow()
  })
})
```

- [ ] **Step 2: Verify the test fails**

Run:

```powershell
pnpm test:unit -- tests/unit/config/env.spec.ts
```

Expected: FAIL because `shared/config/env.ts` does not exist.

- [ ] **Step 3: Implement schema validation**

Install Zod:

```powershell
pnpm add --save-exact zod
```

Create `shared/config/env.ts`:

```ts
import { z } from 'zod'

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  S3_ENDPOINT: z.string().url(),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(8),
  BETTER_AUTH_SECRET: z.string().min(32),
})

export function parseServerEnv(env: Record<string, string | undefined>) {
  return serverEnvSchema.parse(env)
}
```

Document every variable in `.env.example` with development-only non-secret placeholders.

- [ ] **Step 4: Run checks**

Run:

```powershell
pnpm test:unit -- tests/unit/config/env.spec.ts
pnpm typecheck
```

Expected: tests and type-check pass.

- [ ] **Step 5: Commit**

```powershell
git add .env.example shared/config tests/unit/config nuxt.config.ts package.json pnpm-lock.yaml
git commit -m "feat: validate runtime configuration"
```

### Task 5: Add PostgreSQL, MinIO, and health checks

**Files:**
- Create: `compose.yaml`
- Create: `ops/minio/create-bucket.ps1`
- Create: `server/infrastructure/database/client.ts`
- Create: `server/infrastructure/database/schema/health.ts`
- Create: `server/infrastructure/storage/client.ts`
- Create: `server/api/health.get.ts`
- Create: `tests/integration/health.spec.ts`
- Create: `drizzle.config.ts`
- Create: `drizzle/0000_foundation.sql`
- Modify: `package.json`

- [ ] **Step 1: Write the failing health integration test**

Create `tests/integration/health.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'

describe('GET /api/health', () => {
  it('reports database and object storage readiness', async () => {
    const response = await fetch('http://127.0.0.1:3000/api/health')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      status: 'ok',
      database: 'ok',
      objectStorage: 'ok',
    })
  })
})
```

- [ ] **Step 2: Add local infrastructure**

Create `compose.yaml` with PostgreSQL 17, MinIO, and a one-shot `minio-init` service; named volumes; health checks; and localhost-only development ports. Do not place production secrets in the file.

The init service must wait for MinIO readiness, create the configured private bucket if absent, and succeed without changing state when the bucket already exists. `infra:up` must wait for PostgreSQL, MinIO, and successful bucket initialization before returning.

- [ ] **Step 3: Add Drizzle and S3 clients**

Run:

```powershell
pnpm add --save-exact drizzle-orm postgres @aws-sdk/client-s3
pnpm add --save-exact -D drizzle-kit
```

Add scripts:

```json
{
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "infra:up": "docker compose up -d --wait",
  "infra:down": "docker compose down"
}
```

The health handler must execute `select 1` through Drizzle and `HeadBucket` through the S3 client. It runs only after the idempotent bucket initializer has succeeded and returns `503` with stable component states when either dependency fails.

- [ ] **Step 4: Start infrastructure and run migrations**

Run:

```powershell
pnpm infra:up
pnpm db:generate
pnpm db:migrate
```

Expected: PostgreSQL and MinIO become healthy, the configured private bucket exists, a repeated `pnpm infra:up` remains successful, and migration succeeds.

- [ ] **Step 5: Run the integration test**

Start Nuxt, then run:

```powershell
pnpm exec vitest run tests/integration/health.spec.ts
```

Expected: PASS with both dependencies reported `ok`.

- [ ] **Step 6: Commit**

```powershell
git add compose.yaml ops/minio server drizzle drizzle.config.ts tests/integration package.json pnpm-lock.yaml
git commit -m "feat: add database and object storage foundation"
```

### Task 6: Add continuous integration and developer documentation

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `README.md`
- Modify: `docs/progress.md`
- Modify: `docs/operations/tesserae.md`

- [ ] **Step 1: Create CI**

Configure `.github/workflows/ci.yml` to:

1. Use Node.js 22.23.1 and pnpm 11.8.0 with pnpm cache.
2. Install with `pnpm install --frozen-lockfile`.
3. Run `pnpm lint`.
4. Run `pnpm typecheck`.
5. Run `pnpm test:unit`.
6. Run `pnpm build`.
7. Run the same idempotent bucket initializer before Playwright smoke tests with PostgreSQL and MinIO service containers.

- [ ] **Step 2: Document the exact local workflow**

`README.md` must include:

```powershell
corepack enable
corepack prepare pnpm@11.8.0 --activate
pnpm install
Copy-Item .env.example .env
pnpm infra:up
pnpm db:migrate
pnpm dev
```

It must also document all check commands and state that application features remain outside Slice 1.

- [ ] **Step 3: Run the complete local gate**

Run:

```powershell
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build
pnpm test:e2e
git status --short
```

Expected: all commands pass; only intended documentation updates remain uncommitted.

- [ ] **Step 4: Refresh project memory**

Run:

```powershell
$env:PYTHONUTF8='1'
$env:PYTHONIOENCODING='utf-8'
tesserae refresh
```

Expected: Tesserae completes and `.tesserae/` remains ignored.

- [ ] **Step 5: Update progress and commit**

Mark Slice 1 complete in `docs/progress.md`, then:

```powershell
git add .github README.md docs
git commit -m "docs: complete foundation delivery guide"
```
