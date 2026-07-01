# Global Navigation and Page Placeholder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the protected Dashboard landing page, a reusable development-state component, and server-filtered global navigation in the application sidebar.

**Architecture:** The two approved specs form one vertical slice: the shared placeholder makes the new Dashboard usable, while the Navigation feature obtains a browser-safe menu from a thin Nitro adapter backed by a server application service. Stable transport vocabulary lives in `shared/navigation`; global Administration visibility is derived only from the server-resolved `superAdmin` flag.

**Tech Stack:** Nuxt 4, Vue 3, TypeScript, Nitro/H3, shadcn-vue Sidebar, Lucide Vue, Vitest, Playwright, Bun

---

### Task 1: Add the reusable authenticated-page placeholder

**Files:**
- Create: `app/components/app/page-placeholder/index.vue`
- Create: `tests/unit/client/app/page-placeholder.spec.ts`

- [ ] **Step 1: Write the failing structural test**

Create a test that reads the component source and asserts one level-one heading, Russian default copy, a decorative icon, and no route/session/data calls:

```ts
import { readFile } from 'node:fs/promises'
import { expect, it } from 'vitest'

const source = await readFile(
  new URL('../../../../app/components/app/page-placeholder/index.vue', import.meta.url),
  'utf8',
)

it('is a presentation-only accessible development state', () => {
  expect(source).toContain('<h1')
  expect(source).toContain('Страница в разработке')
  expect(source).toContain('Этот раздел пока недоступен. Мы работаем над ним.')
  expect(source).toContain('aria-hidden="true"')
  expect(source).not.toMatch(/useRoute|useFetch|\$fetch|useAuth|useSession/)
})
```

- [ ] **Step 2: Run the test and verify the missing-file failure**

Run: `bunx vitest run tests/unit/client/app/page-placeholder.spec.ts`

Expected: FAIL because `app/components/app/page-placeholder/index.vue` does not exist.

- [ ] **Step 3: Implement the component**

```vue
<script setup lang="ts">
import { Construction } from '@lucide/vue'

withDefaults(defineProps<{
  title?: string
  description?: string
}>(), {
  title: 'Страница в разработке',
  description: 'Этот раздел пока недоступен. Мы работаем над ним.',
})
</script>

<template>
  <section class="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center">
    <Construction aria-hidden="true" class="text-muted-foreground size-10" />
    <h1 class="text-2xl font-semibold tracking-tight">
      {{ title }}
    </h1>
    <p class="text-muted-foreground max-w-md text-sm">
      {{ description }}
    </p>
  </section>
</template>
```

- [ ] **Step 4: Run the focused test**

Run: `bunx vitest run tests/unit/client/app/page-placeholder.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit the component slice**

```powershell
git add -- app/components/app/page-placeholder/index.vue tests/unit/client/app/page-placeholder.spec.ts
git commit -m "ui: add authenticated page placeholder"
```

### Task 2: Put the shared placeholder on Dashboard and Project Credentials

**Files:**
- Create: `app/pages/dashboard/index.vue`
- Modify: `app/pages/projects/[id]/credentials/index.vue`
- Create: `tests/unit/client/app/placeholder-pages.spec.ts`

- [ ] **Step 1: Write the failing page-composition test**

```ts
import { readFile } from 'node:fs/promises'
import { expect, it } from 'vitest'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

it('uses the shared placeholder only on the two approved routes', async () => {
  const [dashboard, credentials] = await Promise.all([
    read('../../../../app/pages/dashboard/index.vue'),
    read('../../../../app/pages/projects/[id]/credentials/index.vue'),
  ])
  expect(dashboard).toContain('<AppPagePlaceholder')
  expect(credentials).toContain('<AppPagePlaceholder')
  expect(credentials).not.toMatch(/password|token|\$fetch|useFetch/i)
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `bunx vitest run tests/unit/client/app/placeholder-pages.spec.ts`

Expected: FAIL because Dashboard is missing and Credentials still renders an empty `div`.

- [ ] **Step 3: Compose both pages**

Use this complete content in both route files:

```vue
<template>
  <AppPagePlaceholder />
</template>
```

- [ ] **Step 4: Run the focused tests and typecheck**

Run: `bunx vitest run tests/unit/client/app/page-placeholder.spec.ts tests/unit/client/app/placeholder-pages.spec.ts`

Expected: 2 files PASS.

Run: `bun run typecheck`

Expected: exit code 0.

- [ ] **Step 5: Commit the route content**

```powershell
git add -- app/pages/dashboard/index.vue app/pages/projects/[id]/credentials/index.vue tests/unit/client/app/placeholder-pages.spec.ts
git commit -m "ui: show development state on pending pages"
```

### Task 3: Define the shared global-navigation contract

**Files:**
- Create: `shared/navigation/constants.ts`
- Create: `shared/navigation/types.ts`
- Create: `tests/unit/navigation/contracts.spec.ts`

- [ ] **Step 1: Write the failing contract test**

```ts
import { expect, it } from 'vitest'
import { GLOBAL_NAVIGATION } from '../../../shared/navigation/constants'

it('defines the closed ordered global navigation vocabulary', () => {
  expect(GLOBAL_NAVIGATION).toEqual({
    DASHBOARD: { id: 'dashboard', labelKey: 'navigation.dashboard', to: '/dashboard', icon: 'layout-dashboard' },
    PROJECTS: { id: 'projects', labelKey: 'navigation.projects', to: '/projects', icon: 'folder-kanban' },
    SETTINGS: { id: 'settings', labelKey: 'navigation.settings', to: '/settings', icon: 'settings' },
    ADMINISTRATION: { id: 'administration', labelKey: 'navigation.administration', to: '/administration', icon: 'shield-check' },
  })
})
```

- [ ] **Step 2: Run the test and verify the missing-module failure**

Run: `bunx vitest run tests/unit/navigation/contracts.spec.ts`

Expected: FAIL because `shared/navigation/constants.ts` is missing.

- [ ] **Step 3: Implement constants and derived types**

Define `GLOBAL_NAVIGATION` exactly as asserted above with `as const`. In `types.ts`, derive the union from the constant and export the transport interface:

```ts
import type { GLOBAL_NAVIGATION } from './constants'

type NavigationDefinition = typeof GLOBAL_NAVIGATION[keyof typeof GLOBAL_NAVIGATION]

export interface GlobalNavigationItem {
  readonly id: NavigationDefinition['id']
  readonly labelKey: NavigationDefinition['labelKey']
  readonly to: NavigationDefinition['to']
  readonly icon: NavigationDefinition['icon']
}
```

- [ ] **Step 4: Run the contract test**

Run: `bunx vitest run tests/unit/navigation/contracts.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit the shared contract**

```powershell
git add -- shared/navigation tests/unit/navigation/contracts.spec.ts
git commit -m "core: define global navigation contract"
```

### Task 4: Build and expose the server-filtered menu

**Files:**
- Create: `server/modules/navigation/get-global-navigation.ts`
- Modify: `server/api/mainMenu.get.ts`
- Create: `tests/unit/navigation/get-global-navigation.spec.ts`

- [ ] **Step 1: Write the failing service tests**

```ts
import { describe, expect, it } from 'vitest'
import { getGlobalNavigation } from '../../../server/modules/navigation/get-global-navigation'

describe('getGlobalNavigation', () => {
  it('returns three base items to an ordinary user', () => {
    expect(getGlobalNavigation({ user: { superAdmin: false } }).map(item => item.id))
      .toEqual(['dashboard', 'projects', 'settings'])
  })

  it('adds administration last for a strict super administrator', () => {
    expect(getGlobalNavigation({ user: { superAdmin: true } }).map(item => item.id))
      .toEqual(['dashboard', 'projects', 'settings', 'administration'])
  })
})
```

- [ ] **Step 2: Run the test and verify the missing-module failure**

Run: `bunx vitest run tests/unit/navigation/get-global-navigation.spec.ts`

Expected: FAIL because the service is missing.

- [ ] **Step 3: Implement the pure application service**

```ts
import type { GlobalNavigationItem } from '../../../shared/navigation/types'
import { GLOBAL_NAVIGATION } from '../../../shared/navigation/constants'

interface NavigationSession { readonly user: { readonly superAdmin?: boolean } }

export function getGlobalNavigation(session: NavigationSession): readonly GlobalNavigationItem[] {
  const base = [
    GLOBAL_NAVIGATION.DASHBOARD,
    GLOBAL_NAVIGATION.PROJECTS,
    GLOBAL_NAVIGATION.SETTINGS,
  ] satisfies readonly GlobalNavigationItem[]

  return session.user.superAdmin === true
    ? [...base, GLOBAL_NAVIGATION.ADMINISTRATION]
    : base
}
```

- [ ] **Step 4: Replace the handler's hard-coded response**

```ts
import { defineEventHandler } from 'h3'
import { requireSession } from '../modules/identity/session/require-session'
import { getGlobalNavigation } from '../modules/navigation/get-global-navigation'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  return getGlobalNavigation(session)
})
```

- [ ] **Step 5: Run focused server tests**

Run: `bunx vitest run tests/unit/navigation/get-global-navigation.spec.ts tests/unit/identity/require-session.spec.ts`

Expected: PASS.

- [ ] **Step 6: Commit the server slice**

```powershell
git add -- server/modules/navigation/get-global-navigation.ts server/api/mainMenu.get.ts tests/unit/navigation/get-global-navigation.spec.ts
git commit -m "feat: serve permission-aware global navigation"
```

### Task 5: Add the client Navigation feature model and API

**Files:**
- Create: `app/features/navigation/api/global-navigation-api.ts`
- Create: `app/features/navigation/model/navigation-state.ts`
- Create: `app/features/navigation/model/icon-registry.ts`
- Create: `app/features/navigation/model/labels.ts`
- Create: `tests/unit/client/navigation/navigation-api.spec.ts`
- Create: `tests/unit/client/navigation/navigation-state.spec.ts`

- [ ] **Step 1: Write failing API and state tests**

The API test must inject `vi.fn().mockResolvedValue(items)`, call `api.load()`, and assert the exact returned array and one request call. The state test must use this complete core:

```ts
import { expect, it, vi } from 'vitest'
import { GLOBAL_NAVIGATION } from '../../../../shared/navigation/constants'
import { createGlobalNavigationState, isGlobalNavigationItemActive } from '../../../../app/features/navigation/model/navigation-state'
import { translateNavigationLabel } from '../../../../app/features/navigation/model/labels'
import { resolveNavigationIcon } from '../../../../app/features/navigation/model/icon-registry'

it('loads, reports a safe error, and retries', async () => {
  const load = vi.fn()
    .mockRejectedValueOnce(new Error('private transport detail'))
    .mockResolvedValueOnce([GLOBAL_NAVIGATION.DASHBOARD])
  const state = createGlobalNavigationState(load)

  await state.load()
  expect(state.error.value).toBe('Не удалось загрузить меню')
  expect(state.pending.value).toBe(false)

  await state.load()
  expect(state.items.value).toEqual([GLOBAL_NAVIGATION.DASHBOARD])
  expect(state.error.value).toBeNull()
  expect(load).toHaveBeenCalledTimes(2)
})

it('matches exact dashboard and destination descendants', () => {
  expect(isGlobalNavigationItemActive(GLOBAL_NAVIGATION.DASHBOARD, '/dashboard')).toBe(true)
  expect(isGlobalNavigationItemActive(GLOBAL_NAVIGATION.DASHBOARD, '/dashboard/stats')).toBe(false)
  expect(isGlobalNavigationItemActive(GLOBAL_NAVIGATION.PROJECTS, '/projects/42')).toBe(true)
})

it('resolves every closed label and icon', () => {
  for (const item of Object.values(GLOBAL_NAVIGATION)) {
    expect(translateNavigationLabel(item.labelKey)).not.toBe(item.labelKey)
    expect(resolveNavigationIcon(item.icon)).toBeTruthy()
  }
})
```

- [ ] **Step 2: Run the focused tests and verify missing-module failures**

Run: `bunx vitest run tests/unit/client/navigation`

Expected: FAIL because the Navigation feature files are missing.

- [ ] **Step 3: Implement the typed API adapter**

```ts
import type { GlobalNavigationItem } from '../../../../shared/navigation/types'

export type GlobalNavigationRequest = () => Promise<readonly GlobalNavigationItem[]>

export const createGlobalNavigationApi = (request: GlobalNavigationRequest) => ({ load: request })
export const globalNavigationApi = createGlobalNavigationApi(
  () => $fetch<GlobalNavigationItem[]>('/api/mainMenu'),
)
```

- [ ] **Step 4: Implement transport-independent state**

```ts
import type { GlobalNavigationItem } from '../../../../shared/navigation/types'
import { ref } from 'vue'

export function createGlobalNavigationState(loadItems: () => Promise<readonly GlobalNavigationItem[]>) {
  const items = ref<readonly GlobalNavigationItem[]>([])
  const pending = ref(false)
  const error = ref<string | null>(null)

  async function load(): Promise<void> {
    pending.value = true
    error.value = null
    try {
      items.value = await loadItems()
    }
    catch {
      error.value = 'Не удалось загрузить меню'
    }
    finally {
      pending.value = false
    }
  }

  return { items, pending, error, load }
}

export function isGlobalNavigationItemActive(item: GlobalNavigationItem, path: string): boolean {
  return item.id === 'dashboard'
    ? path === item.to
    : path === item.to || path.startsWith(`${item.to}/`)
}
```

- [ ] **Step 5: Implement the closed icon registry and temporary translator**

```ts
import type { Component } from 'vue'
import type { GlobalNavigationItem } from '../../../../shared/navigation/types'
import { CircleHelp, FolderKanban, LayoutDashboard, Settings, ShieldCheck } from '@lucide/vue'

const icons: Record<string, Component> = {
  'layout-dashboard': LayoutDashboard,
  'folder-kanban': FolderKanban,
  'settings': Settings,
  'shield-check': ShieldCheck,
}

export const resolveNavigationIcon = (icon: string): Component =>
  icons[icon] ?? CircleHelp
```

```ts
import type { GlobalNavigationItem } from '../../../../shared/navigation/types'

const russianLabels: Record<GlobalNavigationItem['labelKey'], string> = {
  'navigation.dashboard': 'Главная',
  'navigation.projects': 'Проекты',
  'navigation.settings': 'Настройки',
  'navigation.administration': 'Администрирование',
}

// Keep the transport keys stable; replace this adapter when application i18n lands.
export const translateNavigationLabel = (key: GlobalNavigationItem['labelKey']): string => russianLabels[key]
```

- [ ] **Step 6: Run client feature tests**

Run: `bunx vitest run tests/unit/client/navigation`

Expected: PASS.

- [ ] **Step 7: Commit the client model/API slice**

```powershell
git add -- app/features/navigation/api app/features/navigation/model tests/unit/client/navigation
git commit -m "feat: add global navigation client model"
```

### Task 6: Render global navigation in the sidebar

**Files:**
- Create: `app/features/navigation/ui/GlobalNavigation.vue`
- Create: `app/features/navigation/index.ts`
- Modify: `app/components/app/sidebar/index.vue`
- Create: `tests/unit/client/navigation/global-navigation-ui.spec.ts`

- [ ] **Step 1: Write the failing UI-boundary test**

```ts
import { readFile } from 'node:fs/promises'
import { expect, it } from 'vitest'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

it('keeps loading and rendering inside the feature public boundary', async () => {
  const [ui, publicApi, sidebar] = await Promise.all([
    read('../../../../app/features/navigation/ui/GlobalNavigation.vue'),
    read('../../../../app/features/navigation/index.ts'),
    read('../../../../app/components/app/sidebar/index.vue'),
  ])
  expect(ui).toContain('SidebarMenuSkeleton')
  expect(ui).toContain('<NuxtLink')
  expect(ui).toContain('navigation.load')
  expect(publicApi.trim()).toBe("export { default as GlobalNavigation } from './ui/GlobalNavigation.vue'")
  expect(sidebar).toContain("from '@/features/navigation'")
  expect(sidebar).not.toContain('@/features/navigation/')
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `bunx vitest run tests/unit/client/navigation/global-navigation-ui.spec.ts`

Expected: FAIL because the UI and public index are missing.

- [ ] **Step 3: Implement `GlobalNavigation.vue`**

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSkeleton } from '@/components/ui/sidebar'
import { globalNavigationApi } from '../api/global-navigation-api'
import { resolveNavigationIcon } from '../model/icon-registry'
import { translateNavigationLabel } from '../model/labels'
import { createGlobalNavigationState, isGlobalNavigationItemActive } from '../model/navigation-state'

const route = useRoute()
const navigation = createGlobalNavigationState(globalNavigationApi.load)
onMounted(() => void navigation.load())
</script>

<template>
  <SidebarMenu>
    <template v-if="navigation.pending.value">
      <SidebarMenuSkeleton v-for="index in 3" :key="index" show-icon />
    </template>
    <SidebarMenuItem v-else-if="navigation.error.value" class="px-2">
      <p role="alert" class="text-muted-foreground mb-2 text-xs">
        {{ navigation.error.value }}
      </p>
      <UiButton size="sm" variant="outline" @click="navigation.load">
        Повторить
      </UiButton>
    </SidebarMenuItem>
    <template v-else>
      <SidebarMenuItem v-for="item in navigation.items.value" :key="item.id">
        <SidebarMenuButton
          as-child
          :is-active="isGlobalNavigationItemActive(item, route.path)"
        >
          <NuxtLink :to="item.to">
            <component :is="resolveNavigationIcon(item.icon)" aria-hidden="true" />
            <span>{{ translateNavigationLabel(item.labelKey) }}</span>
          </NuxtLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </template>
  </SidebarMenu>
</template>
```

- [ ] **Step 4: Export the feature and simplify the sidebar**

`app/features/navigation/index.ts` must contain:

```ts
export { default as GlobalNavigation } from './ui/GlobalNavigation.vue'
```

Remove the sample navigation arrays from `app/components/app/sidebar/index.vue`, import `GlobalNavigation` from `@/features/navigation`, and render it inside `SidebarContent`. Preserve the existing header and `NavUser` footer data without moving profile work into this slice.

- [ ] **Step 5: Run the UI-boundary test and typecheck**

Run: `bunx vitest run tests/unit/client/navigation/global-navigation-ui.spec.ts`

Expected: PASS.

Run: `bun run typecheck`

Expected: exit code 0.

- [ ] **Step 6: Commit the sidebar integration**

```powershell
git add -- app/features/navigation/ui app/features/navigation/index.ts app/components/app/sidebar/index.vue tests/unit/client/navigation/global-navigation-ui.spec.ts
git commit -m "ui: connect global navigation to sidebar"
```

### Task 7: Make Dashboard the authenticated destination

**Files:**
- Modify: `app/features/identity/model/route-access.ts`
- Modify: `app/features/identity/model/use-sign-in-form.ts`
- Modify: `tests/unit/client/identity/route-access.spec.ts`
- Modify: `tests/unit/client/identity/sign-in-model.spec.ts`
- Modify: `tests/e2e/identity.spec.ts`
- Modify: `tests/e2e/authorization.spec.ts`

- [ ] **Step 1: Change unit expectations first**

Update the redirect union to expect `/dashboard`. Add an authenticated `/` case and change authenticated `/auth`, denied Administration, and successful sign-in expectations from `/projects` to `/dashboard`.

- [ ] **Step 2: Run unit tests and verify the old redirects fail**

Run: `bunx vitest run tests/unit/client/identity/route-access.spec.ts tests/unit/client/identity/sign-in-model.spec.ts`

Expected: FAIL with received `/projects` where `/dashboard` is expected.

- [ ] **Step 3: Implement the redirect policy**

Change `RouteAccessDecision` to allow `'/auth' | '/dashboard'`, then use these exact branches after the missing-session branch:

```ts
if (input.path === '/' || input.path === '/auth')
  return { type: 'redirect', to: '/dashboard' }

if (isAdministrationPath(input.path) && input.session.user.superAdmin !== true)
  return { type: 'redirect', to: '/dashboard' }
```

In `createSignInAction`, replace the successful navigation call with:

```ts
await dependencies.navigate('/dashboard')
```

- [ ] **Step 4: Run the focused unit tests**

Run: `bunx vitest run tests/unit/client/identity/route-access.spec.ts tests/unit/client/identity/sign-in-model.spec.ts tests/unit/client/identity/auth-middleware.spec.ts`

Expected: PASS.

- [ ] **Step 5: Update browser expectations and add menu assertions**

Change successful sign-in URLs to `/dashboard`. After ordinary-user sign-in, assert Dashboard, Projects, and Settings links are visible and Administration is absent. After super-admin sign-in, assert Administration is visible. Assert the Dashboard development heading and the Credentials development heading on direct authorized navigation; do not assert or create any credential values.

- [ ] **Step 6: Commit redirect tests and implementation**

```powershell
git add -- app/features/identity/model tests/unit/client/identity tests/e2e/identity.spec.ts tests/e2e/authorization.spec.ts
git commit -m "feat: make dashboard the authenticated landing page"
```

### Task 8: Verify and record the completed slice

**Files:**
- Modify: `docs/progress.md`

- [ ] **Step 1: Run all unit tests**

Run: `bun run test:unit`

Expected: all unit tests PASS.

- [ ] **Step 2: Run PostgreSQL integration tests**

Run: `bun run test:integration`

Expected: all integration tests PASS with the configured test database.

- [ ] **Step 3: Run focused browser journeys**

Run: `bunx playwright test tests/e2e/identity.spec.ts tests/e2e/authorization.spec.ts`

Expected: all identity and authorization journeys PASS, including Dashboard landing and role-filtered navigation.

- [ ] **Step 4: Run typecheck and production build**

Run: `bun run typecheck`

Expected: exit code 0.

Run: `bun run build`

Expected: exit code 0.

- [ ] **Step 5: Update progress documentation**

Add a completed bullet recording the Dashboard landing route, shared development placeholder on Dashboard and Project Credentials, server-filtered global navigation, Navigation feature boundary, design-system `SidebarMenuSkeleton`, and verification counts from the commands above.

- [ ] **Step 6: Refresh Tesserae through the required wrapper**

Run: `./scripts/refresh-tesserae.ps1`

Expected: `sessions-import`, `compile`, and `obsidian-sync` report `ok`. Do not stage `.tesserae`.

- [ ] **Step 7: Inspect the final diff and commit documentation**

Run: `git diff --check`

Expected: no whitespace errors.

```powershell
git add -- docs/progress.md
git commit -m "docs: record global navigation slice"
```

- [ ] **Step 8: Confirm forbidden artifacts are unstaged**

Run: `git status --short`

Expected: no application or documentation work remains uncommitted; `.tesserae` generated changes, secrets, `.env` files, uploads, backups, and generated indexes are not staged or committed.
