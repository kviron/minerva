# Route Authorization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protect every non-public Nuxt page and application Nitro endpoint with Better Auth sessions, and restrict global administration to the existing `superAdmin` flag.

**Architecture:** Keep client navigation policy as a pure Identity feature model consumed by Nuxt global middleware. Add a pure server HTTP access classifier and one global Nitro middleware that defaults application APIs to authenticated, delegates administration paths to a server-side super-administrator guard, and explicitly permits only approved public endpoints. Project-scoped roles and permission evaluation remain outside this slice.

**Tech Stack:** Nuxt 4 route middleware, Nitro/H3 middleware, Better Auth 1.6, TypeScript, Vitest, Playwright, Bun.

---

## File structure

- `app/features/identity/model/route-access.ts`: pure page classification and navigation decisions.
- `app/features/identity/index.ts`: exposes only the route decision needed by Nuxt middleware.
- `app/middleware/auth.global.ts`: resolves the current session and applies the pure navigation decision.
- `app/features/identity/model/use-sign-in-form.ts`: sends successful sign-in to `/projects`.
- `shared/authorization/constants.ts` and `shared/authorization/types.ts`: stable transport-safe authorization error vocabulary, not project permission codes.
- `server/modules/authorization/authorization-error.ts`: framework-independent forbidden error.
- `server/modules/authorization/require-super-admin.ts`: checks the server-resolved Better Auth user.
- `server/modules/authorization/api-access.ts`: pure method/path classification for Nitro APIs.
- `server/middleware/authorize-api.ts`: default-deny API enforcement entry point.
- Unit, integration, and browser tests mirror those boundaries.

### Task 1: Make page access explicit and testable

**Files:**
- Create: `app/features/identity/model/route-access.ts`
- Modify: `app/features/identity/index.ts`
- Modify: `app/middleware/auth.global.ts`
- Modify: `app/features/identity/model/use-sign-in-form.ts`
- Create: `tests/unit/client/identity/route-access.spec.ts`
- Modify: `tests/unit/client/identity/sign-in-model.spec.ts`

- [ ] **Step 1: Write failing page-policy tests**

Create `tests/unit/client/identity/route-access.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { decideRouteAccess } from '../../../../app/features/identity/model/route-access'

const guest = { session: null, sessionError: false }
const user = { session: { user: { superAdmin: false } }, sessionError: false }
const superAdmin = { session: { user: { superAdmin: true } }, sessionError: false }

describe('decideRouteAccess', () => {
  it.each([
    '/auth',
    '/auth/forgot-password',
    '/auth/reset-password/token',
    '/invitations/token',
    '/legal/terms',
    '/legal/privacy',
  ])('allows the approved public page %s for a guest', (path) => {
    expect(decideRouteAccess({ path, ...guest })).toEqual({ kind: 'allow' })
  })

  it.each(['/auth/extra', '/legal/extra', '/invitations', '/projects'])
    ('does not broaden the public allowlist to %s', (path) => {
      expect(decideRouteAccess({ path, ...guest })).toEqual({
        kind: 'redirect', to: '/auth',
      })
    })

  it('sends an authenticated user away from sign-in', () => {
    expect(decideRouteAccess({ path: '/auth', ...user })).toEqual({
      kind: 'redirect', to: '/projects',
    })
  })

  it('keeps public recovery pages reachable while authenticated', () => {
    expect(decideRouteAccess({ path: '/auth/forgot-password', ...user }))
      .toEqual({ kind: 'allow' })
  })

  it('redirects an ordinary user away from administration', () => {
    expect(decideRouteAccess({ path: '/administration/users', ...user })).toEqual({
      kind: 'redirect', to: '/projects',
    })
  })

  it('allows a super administrator into administration', () => {
    expect(decideRouteAccess({ path: '/administration/users', ...superAdmin }))
      .toEqual({ kind: 'allow' })
  })

  it('does not turn a session lookup failure into a sign-out redirect', () => {
    expect(decideRouteAccess({ path: '/projects', session: null, sessionError: true }))
      .toEqual({ kind: 'error' })
  })
})
```

In `tests/unit/client/identity/sign-in-model.spec.ts`, change the successful navigation expectation from `/` to `/projects`.

- [ ] **Step 2: Run the focused tests and observe the intended failures**

Run:

```powershell
bunx vitest run tests/unit/client/identity/route-access.spec.ts tests/unit/client/identity/sign-in-model.spec.ts
```

Expected: FAIL because `route-access.ts` does not exist and the sign-in action still navigates to `/`.

- [ ] **Step 3: Implement the pure page policy**

Create `app/features/identity/model/route-access.ts`:

```ts
interface RouteSession {
  readonly user: { readonly superAdmin?: boolean }
}

interface RouteAccessInput {
  readonly path: string
  readonly session: RouteSession | null
  readonly sessionError: boolean
}

export type RouteAccessDecision =
  | { readonly kind: 'allow' }
  | { readonly kind: 'error' }
  | { readonly kind: 'redirect', readonly to: '/auth' | '/projects' }

const publicStaticPaths = new Set([
  '/auth',
  '/auth/forgot-password',
  '/legal/terms',
  '/legal/privacy',
])

function isPublicPage(path: string) {
  return publicStaticPaths.has(path)
    || /^\/auth\/reset-password\/[^/]+$/.test(path)
    || /^\/invitations\/[^/]+$/.test(path)
}

export function decideRouteAccess(input: RouteAccessInput): RouteAccessDecision {
  if (input.sessionError) return { kind: 'error' }
  if (!input.session)
    return isPublicPage(input.path) ? { kind: 'allow' } : { kind: 'redirect', to: '/auth' }
  if (input.path === '/auth') return { kind: 'redirect', to: '/projects' }
  if (
    (input.path === '/administration' || input.path.startsWith('/administration/'))
    && !input.session.user.superAdmin
  ) return { kind: 'redirect', to: '/projects' }
  return { kind: 'allow' }
}
```

Export `decideRouteAccess` from `app/features/identity/index.ts`. Update `app/middleware/auth.global.ts` to call `getIdentitySession()`, pass both `data` and `error` into the policy, return `navigateTo(decision.to)` for redirects, and return `abortNavigation(createError({ statusCode: 503, statusMessage: 'Service Unavailable' }))` for `kind === 'error'`.

Use this complete middleware body:

```ts
import { decideRouteAccess, getIdentitySession } from '@/features/identity'

export default defineNuxtRouteMiddleware(async (to) => {
  const { data: session, error } = await getIdentitySession()
  const decision = decideRouteAccess({
    path: to.path,
    session,
    sessionError: Boolean(error),
  })

  if (decision.kind === 'redirect') return navigateTo(decision.to)
  if (decision.kind === 'error') {
    return abortNavigation(createError({
      statusCode: 503,
      statusMessage: 'Service Unavailable',
    }))
  }
})
```

Change `createSignInAction` in `app/features/identity/model/use-sign-in-form.ts` to call `navigate('/projects')`.

- [ ] **Step 4: Run client unit tests**

Run:

```powershell
bunx vitest run tests/unit/client/identity
```

Expected: all client Identity tests PASS.

- [ ] **Step 5: Commit the client page gate**

```powershell
git add -- app/features/identity app/middleware/auth.global.ts tests/unit/client/identity
git commit -m "feat: enforce authenticated page access"
```

### Task 2: Add the server authorization vocabulary and super-administrator guard

**Files:**
- Create: `shared/authorization/constants.ts`
- Create: `shared/authorization/types.ts`
- Create: `server/modules/authorization/authorization-error.ts`
- Create: `server/modules/authorization/require-super-admin.ts`
- Create: `tests/unit/authorization/require-super-admin.spec.ts`
- Modify: `tests/unit/identity/constants.spec.ts`

- [ ] **Step 1: Write the failing guard tests**

Create `tests/unit/authorization/require-super-admin.spec.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { AUTHORIZATION_CODE } from '../../../shared/authorization/constants'
import { createRequireSuperAdmin } from '../../../server/modules/authorization/require-super-admin'

describe('createRequireSuperAdmin', () => {
  it('returns the server-resolved super administrator session', async () => {
    const session = { user: { id: 'admin-id', superAdmin: true } }
    const requireSession = vi.fn().mockResolvedValue(session)
    const guard = createRequireSuperAdmin(requireSession)
    const event = {} as never

    await expect(guard(event)).resolves.toBe(session)
    expect(requireSession).toHaveBeenCalledWith(event)
  })

  it('rejects an ordinary authenticated user with the stable forbidden code', async () => {
    const guard = createRequireSuperAdmin(async () => ({
      user: { id: 'user-id', superAdmin: false },
    }))

    await expect(guard({} as never)).rejects.toMatchObject({
      code: AUTHORIZATION_CODE.FORBIDDEN,
      statusCode: 403,
    })
  })
})
```

Extend `tests/unit/identity/constants.spec.ts` to assert that `AUTHORIZATION_CODE.FORBIDDEN` is exactly `'FORBIDDEN'` and assignable to `AuthorizationCode`.

- [ ] **Step 2: Run the guard tests and observe the missing modules**

Run:

```powershell
bunx vitest run tests/unit/authorization/require-super-admin.spec.ts tests/unit/identity/constants.spec.ts
```

Expected: FAIL because the authorization modules do not exist.

- [ ] **Step 3: Implement the minimal server guard**

Create `shared/authorization/constants.ts`:

```ts
export const AUTHORIZATION_CODE = {
  FORBIDDEN: 'FORBIDDEN',
} as const
```

Create `shared/authorization/types.ts`:

```ts
type ValueOf<T> = T[keyof T]

export type AuthorizationCode = ValueOf<
  typeof import('./constants').AUTHORIZATION_CODE
>
```

Create `server/modules/authorization/authorization-error.ts`:

```ts
import type { AuthorizationCode } from '../../../shared/authorization/types'

export class AuthorizationError extends Error {
  readonly statusCode = 403

  constructor(public readonly code: AuthorizationCode) {
    super(code)
    this.name = 'AuthorizationError'
  }
}
```

Create `server/modules/authorization/require-super-admin.ts`:

```ts
import type { H3Event } from 'h3'
import { AUTHORIZATION_CODE } from '../../../shared/authorization/constants'
import { requireSession } from '../identity/session/require-session'
import { AuthorizationError } from './authorization-error'

interface AdministratorSession {
  readonly user: { readonly superAdmin?: boolean }
}

export function createRequireSuperAdmin<Session extends AdministratorSession>(
  requireAuthenticatedSession: (event: H3Event) => Promise<Session>,
) {
  return async (event: H3Event): Promise<Session> => {
    const session = await requireAuthenticatedSession(event)
    if (!session.user.superAdmin)
      throw new AuthorizationError(AUTHORIZATION_CODE.FORBIDDEN)
    return session
  }
}

export const requireSuperAdmin = createRequireSuperAdmin(requireSession)
```

- [ ] **Step 4: Run authorization and existing Identity guard tests**

Run:

```powershell
bunx vitest run tests/unit/authorization tests/unit/identity/require-session.spec.ts tests/unit/identity/constants.spec.ts
```

Expected: all selected tests PASS.

- [ ] **Step 5: Commit the super-administrator guard**

```powershell
git add -- shared/authorization server/modules/authorization tests/unit/authorization tests/unit/identity/constants.spec.ts
git commit -m "feat: add super administrator guard"
```

### Task 3: Default application APIs to authenticated

**Files:**
- Create: `server/modules/authorization/api-access.ts`
- Create: `server/middleware/authorize-api.ts`
- Create: `tests/unit/authorization/api-access.spec.ts`
- Create: `tests/unit/authorization/authorize-api-middleware.spec.ts`

- [ ] **Step 1: Write failing API classification tests**

Create `tests/unit/authorization/api-access.spec.ts` with a table asserting:

```ts
import { describe, expect, it } from 'vitest'
import { classifyApiAccess } from '../../../server/modules/authorization/api-access'

describe('classifyApiAccess', () => {
  it.each([
    ['GET', '/api/auth/get-session'],
    ['POST', '/api/auth/sign-out'],
    ['POST', '/api/identity/sign-in'],
    ['POST', '/api/identity/request-password-reset'],
    ['POST', '/api/identity/reset-password'],
    ['GET', '/api/health/database'],
  ])('keeps %s %s public', (method, path) => {
    expect(classifyApiAccess(method, path)).toBe('public')
  })

  it.each([
    ['GET', '/api/mainMenu'],
    ['GET', '/api/identity/sign-in'],
    ['POST', '/api/health/database'],
    ['GET', '/api/future'],
  ])('requires authentication for %s %s', (method, path) => {
    expect(classifyApiAccess(method, path)).toBe('authenticated')
  })

  it.each([
    '/api/administration',
    '/api/administration/users',
  ])('requires a super administrator for GET %s', (path) => {
    expect(classifyApiAccess('GET', path)).toBe('super-admin')
  })

  it('ignores non-API requests', () => {
    expect(classifyApiAccess('GET', '/projects')).toBe('not-api')
  })
})
```

Create `tests/unit/authorization/authorize-api-middleware.spec.ts`:

```ts
import type { H3Event } from 'h3'
import { describe, expect, it, vi } from 'vitest'
import { createAuthorizeApi } from '../../../server/middleware/authorize-api'

function event(method: string, path: string) {
  return {
    method,
    path,
    headers: new Headers({ host: '127.0.0.1:3000' }),
    node: { req: { method, url: path, headers: { host: '127.0.0.1:3000' } } },
  } as unknown as H3Event
}

describe('createAuthorizeApi', () => {
  it('skips public and non-API requests', async () => {
    const requireSession = vi.fn()
    const requireSuperAdmin = vi.fn()
    const authorize = createAuthorizeApi({ requireSession, requireSuperAdmin })

    await authorize(event('POST', '/api/identity/sign-in'))
    await authorize(event('GET', '/projects'))

    expect(requireSession).not.toHaveBeenCalled()
    expect(requireSuperAdmin).not.toHaveBeenCalled()
  })

  it('requires a session for an application API', async () => {
    const requireSession = vi.fn()
    const authorize = createAuthorizeApi({ requireSession, requireSuperAdmin: vi.fn() })
    const request = event('GET', '/api/mainMenu')

    await authorize(request)

    expect(requireSession).toHaveBeenCalledWith(request)
  })

  it('requires a super administrator for administration APIs', async () => {
    const requireSuperAdmin = vi.fn()
    const authorize = createAuthorizeApi({ requireSession: vi.fn(), requireSuperAdmin })
    const request = event('GET', '/api/administration/users')

    await authorize(request)

    expect(requireSuperAdmin).toHaveBeenCalledWith(request)
  })
})
```

- [ ] **Step 2: Run the API authorization unit tests and observe failure**

Run:

```powershell
bunx vitest run tests/unit/authorization/api-access.spec.ts tests/unit/authorization/authorize-api-middleware.spec.ts
```

Expected: FAIL because the classifier and middleware factory do not exist.

- [ ] **Step 3: Implement the exact allowlist and middleware factory**

Create `server/modules/authorization/api-access.ts`:

```ts
export type ApiAccess = 'not-api' | 'public' | 'authenticated' | 'super-admin'

const publicEndpoints = new Set([
  'POST /api/identity/sign-in',
  'POST /api/identity/request-password-reset',
  'POST /api/identity/reset-password',
  'GET /api/health/database',
])

export function classifyApiAccess(method: string, path: string): ApiAccess {
  if (path !== '/api' && !path.startsWith('/api/')) return 'not-api'
  if (path === '/api/auth' || path.startsWith('/api/auth/')) return 'public'
  if (publicEndpoints.has(`${method.toUpperCase()} ${path}`)) return 'public'
  if (path === '/api/administration' || path.startsWith('/api/administration/'))
    return 'super-admin'
  return 'authenticated'
}
```

Create `server/middleware/authorize-api.ts` with an exported factory:

```ts
import type { H3Event } from 'h3'
import { defineEventHandler, getMethod, getRequestURL } from 'h3'
import { requireSuperAdmin } from '../modules/authorization/require-super-admin'
import { classifyApiAccess } from '../modules/authorization/api-access'
import { requireSession } from '../modules/identity/session/require-session'

interface Dependencies {
  readonly requireSession: (event: H3Event) => Promise<unknown>
  readonly requireSuperAdmin: (event: H3Event) => Promise<unknown>
}

export function createAuthorizeApi(dependencies: Dependencies) {
  return async (event: H3Event) => {
    const access = classifyApiAccess(getMethod(event), getRequestURL(event).pathname)
    if (access === 'authenticated') await dependencies.requireSession(event)
    if (access === 'super-admin') await dependencies.requireSuperAdmin(event)
  }
}

export default defineEventHandler(createAuthorizeApi({ requireSession, requireSuperAdmin }))
```

Keep the explicit guard in `server/api/mainMenu.get.ts` as defense in depth. Do not add temporary project-role checks.

- [ ] **Step 4: Run all authorization unit tests**

Run:

```powershell
bunx vitest run tests/unit/authorization tests/unit/identity/require-session.spec.ts
```

Expected: all selected tests PASS.

- [ ] **Step 5: Commit default-deny API authentication**

```powershell
git add -- server/modules/authorization/api-access.ts server/middleware/authorize-api.ts tests/unit/authorization
git commit -m "feat: protect application APIs by default"
```

### Task 4: Prove route protection through the running application

**Files:**
- Modify: `tests/e2e/global.setup.ts`
- Modify: `tests/e2e/identity.spec.ts`
- Create: `tests/e2e/authorization.spec.ts`

- [ ] **Step 1: Add failing browser and direct-API scenarios**

In `tests/e2e/global.setup.ts`, seed a second account with `createMinervaAuth({ mode: AUTH_MODE.BOOTSTRAP, ... })` using `admin@example.com`, username `super.admin`, and password `Correct-Horse-Battery-1`. This reuses the existing bootstrap database hook and proves the real `super_admin` field.

Immediately after the existing ordinary-user `signUpEmail` call, add:

```ts
const adminAuth = createMinervaAuth({
  mode: AUTH_MODE.BOOTSTRAP,
  db: database.db,
  baseURL: 'http://127.0.0.1:3000',
  trustedOrigins: ['http://127.0.0.1:3000'],
  mailer: { sendPasswordReset: async () => {} },
})
await adminAuth.api.signUpEmail({
  body: {
    email: 'admin@example.com',
    username: 'super.admin',
    displayUsername: 'Super.Admin',
    name: 'Super.Admin',
    password: 'Correct-Horse-Battery-1',
  },
})
```

Create `tests/e2e/authorization.spec.ts` covering these exact outcomes:

```ts
import { expect, test, type Page } from '@playwright/test'

const password = 'Correct-Horse-Battery-1'

async function signIn(page: Page, identifier: string) {
  await page.goto('/auth')
  await page.locator('#email').fill(identifier)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page).toHaveURL(/\/projects$/)
}

test('keeps approved pages and readiness public', async ({ page, request }) => {
  for (const path of ['/auth', '/auth/forgot-password', '/legal/terms', '/legal/privacy']) {
    await page.goto(path)
    await expect(page).toHaveURL(new RegExp(`${path.replaceAll('/', '\\/')}$`))
  }
  expect((await request.get('/api/health/database')).status()).toBe(200)
})

test('rejects a direct unauthenticated application API call', async ({ request }) => {
  expect((await request.get('/api/mainMenu')).status()).toBe(401)
})

test('redirects an ordinary user away from administration', async ({ page }) => {
  await signIn(page, 'user@example.com')
  await page.goto('/administration/users')
  await expect(page).toHaveURL(/\/projects$/)
})

test('allows the bootstrapped super administrator into administration', async ({ page }) => {
  await signIn(page, 'admin@example.com')
  await page.goto('/administration/users')
  await expect(page).toHaveURL(/\/administration\/users$/)
})
```

Update existing successful sign-in expectations in `tests/e2e/identity.spec.ts` from `/` to `/projects`.

- [ ] **Step 2: Start test infrastructure and run the new scenarios to observe failure**

Run:

```powershell
docker compose --profile test up -d --wait postgres-test mailpit
bunx playwright test tests/e2e/authorization.spec.ts tests/e2e/identity.spec.ts
```

Expected before the implementation is complete: at least the `/projects` and administration expectations FAIL.

- [ ] **Step 3: Run the complete browser file set**

Run:

```powershell
bunx playwright test
```

Expected: all Playwright tests PASS, including recovery, reset, guest redirect, ordinary-user denial, and super-administrator access.

- [ ] **Step 4: Commit browser coverage**

```powershell
git add -- tests/e2e app server shared
git commit -m "test: cover route authorization boundaries"
```

### Task 5: Complete verification and project records

**Files:**
- Modify: `docs/progress.md`

- [ ] **Step 1: Run the complete automated verification**

```powershell
docker compose --profile test up -d --wait postgres-test mailpit
bun run typecheck
bun run test:unit
bun run test:integration
bun run test:e2e
bun run build
```

Expected: every command exits `0`. Existing third-party build warnings may be reported, but no failed test, type error, or build error is acceptable.

- [ ] **Step 2: Record the completed slice**

Append one concise bullet to `docs/progress.md` stating that Nuxt pages and application Nitro APIs now default to authenticated, approved public recovery/legal/readiness surfaces remain public, and global administration uses the server-resolved `superAdmin` flag.

- [ ] **Step 3: Refresh Tesserae through the Windows wrapper**

```powershell
./scripts/refresh-tesserae.ps1
```

Expected: sessions import, compile, and Obsidian sync report success. Do not stage `.tesserae` output.

- [ ] **Step 4: Verify the final diff and exclusions**

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors; `.env`, `.output`, `.tesserae`, uploads, backups, secrets, and generated indexes are not staged. Preserve unrelated user changes.

- [ ] **Step 5: Commit progress documentation**

```powershell
git add -- docs/progress.md
git commit -m "docs: record route authorization slice"
```

- [ ] **Step 6: Request review and finish the branch**

Use `superpowers:requesting-code-review`, then `superpowers:verification-before-completion`, and finally `superpowers:finishing-a-development-branch`. Report any unavailable Docker, Mailpit, or browser dependency separately and never claim its check passed without successful output.
