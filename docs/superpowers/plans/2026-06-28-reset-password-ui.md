# Reset-Password UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a static Russian form for entering and confirming a new password on the existing tokenized reset-password route.

**Architecture:** Keep the form in a focused auto-imported Nuxt component and keep the shared auth-shell composition in the route page. Reuse installed shadcn-vue primitives and do not read the token or add validation, state, API calls, or authentication behavior.

**Tech Stack:** Nuxt 4, Vue 3 `<script setup>`, TypeScript, shadcn-vue/Reka UI, Tailwind CSS 4, Bun

---

## File structure

- Create `app/components/ResetPasswordForm/index.vue`: static new-password and confirmation form.
- Modify `app/pages/auth/reset-password/[token].vue`: tokenized route shell and form placement.
- Modify `docs/progress.md`: record completion of this approved isolated UI slice.

### Task 1: Add the reset-password form component

**Files:**
- Create: `app/components/ResetPasswordForm/index.vue`

- [ ] **Step 1: Run the component assertion and verify it fails**

```powershell
$path = 'app/components/ResetPasswordForm/index.vue'
if (-not (Test-Path -LiteralPath $path)) {
  throw "Missing reset-password form: $path"
}

$source = Get-Content -Raw -Encoding UTF8 -LiteralPath $path
$required = @(
  'Новый пароль',
  'Подтвердите пароль',
  'Сохранить новый пароль',
  'id="new-password"',
  'id="confirm-password"',
  'autocomplete="new-password"',
  'to="/auth"'
)
$missing = $required | Where-Object { -not $source.Contains($_) }
if ($missing) {
  throw "Reset-password form is missing: $($missing -join ', ')"
}
```

Expected: FAIL with `Missing reset-password form`.

- [ ] **Step 2: Review the installed shadcn-vue primitive APIs**

Run:

```powershell
bunx --bun shadcn-vue@latest docs field input button
```

Expected: the command prints official documentation URLs. Review them without reinstalling or overwriting the existing primitives.

- [ ] **Step 3: Create the minimal form component**

Create `app/components/ResetPasswordForm/index.vue`:

```vue
<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <form :class="cn('flex flex-col gap-6', props.class)">
    <UiFieldGroup>
      <div class="flex flex-col items-center gap-1 text-center">
        <h1 class="text-2xl font-bold">
          Новый пароль
        </h1>
        <p class="text-muted-foreground text-sm text-balance">
          Введите новый пароль дважды, чтобы подтвердить его
        </p>
      </div>
      <UiField>
        <UiFieldLabel for="new-password">
          Новый пароль
        </UiFieldLabel>
        <UiInput
          id="new-password"
          type="password"
          size="lg"
          autocomplete="new-password"
          required
        />
      </UiField>
      <UiField>
        <UiFieldLabel for="confirm-password">
          Подтвердите пароль
        </UiFieldLabel>
        <UiInput
          id="confirm-password"
          type="password"
          size="lg"
          autocomplete="new-password"
          required
        />
      </UiField>
      <UiField>
        <UiButton type="submit" class="w-full">
          Сохранить новый пароль
        </UiButton>
      </UiField>
      <UiField>
        <p class="text-center text-sm">
          <NuxtLink to="/auth" class="underline-offset-4 hover:underline">
            Вернуться ко входу
          </NuxtLink>
        </p>
      </UiField>
    </UiFieldGroup>
  </form>
</template>
```

- [ ] **Step 4: Re-run the component assertion**

Run the PowerShell assertion from Step 1.

Expected: command exits successfully with no output.

- [ ] **Step 5: Check the component file**

Run:

```powershell
$source = Get-Content -Raw -Encoding UTF8 -LiteralPath 'app/components/ResetPasswordForm/index.vue'
if ([regex]::Matches($source, 'autocomplete="new-password"').Count -ne 2) {
  throw 'Both password inputs must use autocomplete="new-password"'
}
if ($source.Contains('useRoute') -or $source.Contains('$route')) {
  throw 'The UI-only form must not read the route token'
}
```

Expected: both assertions pass.

### Task 2: Render the form on the tokenized route

**Files:**
- Modify: `app/pages/auth/reset-password/[token].vue`

- [ ] **Step 1: Run the route assertion and verify it fails**

```powershell
$path = 'app/pages/auth/reset-password/[token].vue'
$source = Get-Content -Raw -Encoding UTF8 -LiteralPath $path

if (-not $source.Contains('<ResetPasswordForm />')) {
  throw 'Reset-password route does not render ResetPasswordForm'
}
if (-not $source.Contains('/images/auth/minerva-auth-visual.png')) {
  throw 'Reset-password route does not reuse the auth visual'
}
if ($source.Contains('useRoute') -or $source.Contains('$route')) {
  throw 'Reset-password route must not read the token in this UI-only slice'
}
```

Expected: FAIL because the tokenized route is still an empty stub.

- [ ] **Step 2: Replace the route stub with the established auth shell**

Replace `app/pages/auth/reset-password/[token].vue` with:

```vue
<script setup lang="ts">
import { GalleryVerticalEnd } from "@lucide/vue"
</script>

<template>
  <div class="grid min-h-svh lg:grid-cols-2">
    <div class="flex flex-col gap-4 p-6 md:p-10">
      <div class="flex justify-center gap-2 md:justify-start">
        <NuxtLink to="/auth" class="flex items-center gap-2 font-medium">
          <div class="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
            <GalleryVerticalEnd class="size-4" />
          </div>
          Минерва
        </NuxtLink>
      </div>
      <div class="flex flex-1 items-center justify-center">
        <div class="w-full max-w-xs">
          <ResetPasswordForm />
        </div>
      </div>
    </div>
    <div class="bg-muted relative hidden lg:block">
      <img
        src="/images/auth/minerva-auth-visual.png"
        alt=""
        class="absolute inset-0 h-full w-full object-cover"
      >
    </div>
  </div>
</template>
```

- [ ] **Step 3: Re-run the route assertion**

Run the PowerShell assertion from Step 1.

Expected: command exits successfully with no output.

- [ ] **Step 4: Build the Nuxt application**

Run:

```powershell
bun run build
```

Expected: Nuxt build exits with code 0 and reports no Vue template, TypeScript, or auto-import errors.

### Task 3: Record and verify the completed slice

**Files:**
- Modify: `docs/progress.md`

- [ ] **Step 1: Add the completed progress entry**

Append this item to the `## Completed` list in `docs/progress.md`:

```markdown
- Added the approved static new-password form on the tokenized reset route without exposing or processing the token.
```

- [ ] **Step 2: Refresh Tesserae through the Windows wrapper**

Run:

```powershell
./scripts/refresh-tesserae.ps1
```

Expected: sessions import, compile, and Obsidian sync all report `ok`.

- [ ] **Step 3: Run final scoped verification**

```powershell
$component = Get-Content -Raw -Encoding UTF8 -LiteralPath 'app/components/ResetPasswordForm/index.vue'
$page = Get-Content -Raw -Encoding UTF8 -LiteralPath 'app/pages/auth/reset-password/[token].vue'

if ([regex]::Matches($component, 'autocomplete="new-password"').Count -ne 2) { throw 'Expected two new-password autocomplete attributes' }
if (-not $component.Contains('id="new-password"')) { throw 'New-password input ID is missing' }
if (-not $component.Contains('id="confirm-password"')) { throw 'Confirmation input ID is missing' }
if (-not $component.Contains('to="/auth"')) { throw 'Return-to-login link is missing' }
if (-not $page.Contains('<ResetPasswordForm />')) { throw 'ResetPasswordForm is not rendered' }
if ($component.Contains('useRoute') -or $component.Contains('$route') -or $page.Contains('useRoute') -or $page.Contains('$route')) { throw 'Route token must remain unread' }

bun run build
git diff --check -- app/pages/auth/reset-password/[token].vue docs/progress.md
```

Expected: all assertions pass, the build exits with code 0, and the tracked-file diff check reports no whitespace errors.

- [ ] **Step 4: Review the scoped working tree before integration**

Run:

```powershell
git diff -- app/pages/auth/reset-password/[token].vue docs/progress.md
git status --short -- app/components/ResetPasswordForm/index.vue app/pages/auth/reset-password/[token].vue docs/progress.md
```

Expected: the reset-password files contain only the approved static UI. Because `docs/progress.md` already contains earlier uncommitted work, do not stage or commit it automatically unless the user explicitly chooses an integration option.
