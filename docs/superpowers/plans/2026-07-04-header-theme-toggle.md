# Header Theme Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the authenticated header's template GitHub link with the existing shared selector for light, dark, and system themes.

**Architecture:** Keep color preference ownership inside `modeToggle`, backed by Nuxt Color Mode, and let `AppHeader` only compose that shared control. Use installed shadcn-vue primitives and the configured Lucide icons, with focused happy-dom tests written before production changes.

**Tech Stack:** Nuxt 4, Vue 3, TypeScript, `@nuxtjs/color-mode`, shadcn-vue/Reka UI, Lucide Vue, Vitest, Vue Test Utils, happy-dom, Bun.

---

## File map

- Modify `app/components/modeToggle/index.vue`: accessible localized theme control.
- Modify `app/components/app/header/index.vue`: remove GitHub and compose `ModeToggle`.
- Create `tests/unit/client/app/mode-toggle.spec.ts`: verify choices and preference assignment.
- Create `tests/unit/client/app/header.spec.ts`: verify header composition.
- Modify `docs/progress.md`: record the verified slice.

### Task 1: Localize and verify the shared theme selector

**Files:**
- Create: `tests/unit/client/app/mode-toggle.spec.ts`
- Modify: `app/components/modeToggle/index.vue`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/client/app/mode-toggle.spec.ts`:

```ts
// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ModeToggle from '@/components/modeToggle/index.vue'

const colorMode = { preference: 'system' }
const passthrough = (name: string, template = '<div><slot /></div>') => ({ name, template })
const DropdownMenuItem = {
  name: 'DropdownMenuItem',
  template: '<button type="button"><slot /></button>',
}

const mountToggle = () => mount(ModeToggle, {
  global: {
    stubs: {
      Button: passthrough('Button', '<button type="button"><slot /></button>'),
      DropdownMenu: passthrough('DropdownMenu'),
      DropdownMenuContent: passthrough('DropdownMenuContent'),
      DropdownMenuItem,
      DropdownMenuTrigger: passthrough('DropdownMenuTrigger'),
      Moon: true,
      Sun: true,
    },
  },
})

describe('ModeToggle', () => {
  beforeEach(() => {
    colorMode.preference = 'system'
    vi.stubGlobal('useColorMode', () => colorMode)
  })

  it('exposes a Russian trigger and all supported preferences', () => {
    const wrapper = mountToggle()
    expect(wrapper.get('[aria-label="Переключить тему"]').exists()).toBe(true)
    expect(wrapper.findAllComponents(DropdownMenuItem).map(item => item.text())).toEqual([
      'Светлая', 'Тёмная', 'Системная',
    ])
  })

  it.each([
    ['Светлая', 'light'],
    ['Тёмная', 'dark'],
    ['Системная', 'system'],
  ])('sets %s preference', async (label, preference) => {
    const wrapper = mountToggle()
    const item = wrapper.findAllComponents(DropdownMenuItem).find(candidate => candidate.text() === label)
    await item?.trigger('click')
    expect(colorMode.preference).toBe(preference)
  })
})
```

- [ ] **Step 2: Verify RED**

Run `bun run test:unit -- tests/unit/client/app/mode-toggle.spec.ts`.

Expected: FAIL because the trigger lacks the Russian accessible label and the menu is English.

- [ ] **Step 3: Implement the minimal selector**

Replace `app/components/modeToggle/index.vue` with:

```vue
<script setup lang="ts">
import { Moon, Sun } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const colorMode = useColorMode()
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="outline" size="icon" aria-label="Переключить тему">
        <Sun aria-hidden="true" class="size-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon aria-hidden="true" class="absolute size-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span class="sr-only">Переключить тему</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem @click="colorMode.preference = 'light'">Светлая</DropdownMenuItem>
      <DropdownMenuItem @click="colorMode.preference = 'dark'">Тёмная</DropdownMenuItem>
      <DropdownMenuItem @click="colorMode.preference = 'system'">Системная</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
```

- [ ] **Step 4: Verify GREEN**

Run `bun run test:unit -- tests/unit/client/app/mode-toggle.spec.ts`.

Expected: PASS with 4 passing cases and no warnings.

- [ ] **Step 5: Commit the selector slice**

Run:

```powershell
git add -- app/components/modeToggle/index.vue tests/unit/client/app/mode-toggle.spec.ts
git commit -m "feat: localize theme selector"
```

### Task 2: Replace the header's GitHub link

**Files:**
- Create: `tests/unit/client/app/header.spec.ts`
- Modify: `app/components/app/header/index.vue`

- [ ] **Step 1: Write the failing composition test**

Create `tests/unit/client/app/header.spec.ts`:

```ts
// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppHeader from '@/components/app/header/index.vue'

const ModeToggle = { name: 'ModeToggle', template: '<button data-mode-toggle type="button" />' }

describe('AppHeader', () => {
  it('renders the theme selector instead of the GitHub link', () => {
    const wrapper = mount(AppHeader, {
      global: { stubs: { ModeToggle, UiSeparator: true, UiSidebarTrigger: true } },
    })
    expect(wrapper.getComponent(ModeToggle).exists()).toBe(true)
    expect(wrapper.find('a[href*="github.com"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('GitHub')
  })
})
```

- [ ] **Step 2: Verify RED**

Run `bun run test:unit -- tests/unit/client/app/header.spec.ts`.

Expected: FAIL because the header still contains GitHub and lacks `ModeToggle`.

- [ ] **Step 3: Compose the selector**

Replace the header script with:

```vue
<script setup lang="ts">
import ModeToggle from '@/components/modeToggle/index.vue'
</script>
```

Replace the complete GitHub `Button` block with `<ModeToggle />`. Preserve the surrounding header, sidebar trigger, separator, title, and right-aligned container exactly.

- [ ] **Step 4: Verify GREEN**

Run `bun run test:unit -- tests/unit/client/app/header.spec.ts tests/unit/client/app/mode-toggle.spec.ts`.

Expected: PASS with 5 passing cases and no warnings.

- [ ] **Step 5: Commit the header slice**

Run:

```powershell
git add -- app/components/app/header/index.vue tests/unit/client/app/header.spec.ts
git commit -m "feat: add theme selector to header"
```

### Task 3: Verify and document the slice

**Files:**
- Modify: `docs/progress.md`
- Refresh generated, uncommitted Tesserae state through `scripts/refresh-tesserae.ps1`

- [ ] **Step 1: Run full verification**

Run, in order:

```powershell
bun run test:unit
bun run typecheck
bun run build
```

Expected: every command exits 0; all unit tests pass without warnings; typecheck reports no TypeScript errors; Nuxt produces a successful production build.

- [ ] **Step 2: Record verification evidence**

Append under `## Completed` in `docs/progress.md`:

```markdown
- Replaced the authenticated header's template GitHub link with the shared localized light, dark, and system theme selector. Verification on 2026-07-04 passed the complete unit suite, Nuxt typecheck, and the production build.
```

- [ ] **Step 3: Refresh Tesserae**

Run `./scripts/refresh-tesserae.ps1`.

Expected: `sessions-import`, `compile`, and `obsidian-sync` report `ok`. Do not stage `.tesserae`.

- [ ] **Step 4: Check scope and preserve user work**

Run:

```powershell
git diff --check
git status --short
git diff -- app/components/app/sidebar/index.vue
```

Expected: no whitespace errors; only planned files plus pre-existing `.tesserae` state and the user's `Sidebar collapsible="icon"` edit appear. The sidebar diff remains unchanged and unstaged.

- [ ] **Step 5: Commit progress only**

Run:

```powershell
git add -- docs/progress.md
git commit -m "docs: record header theme selector"
```

Do not stage `.tesserae` or `app/components/app/sidebar/index.vue`.
