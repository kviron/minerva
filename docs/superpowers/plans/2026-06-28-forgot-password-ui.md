# Forgot-Password UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a static Russian password-recovery request page that matches the existing Minerva sign-in screen and is reachable from the login form.

**Architecture:** Keep the form as a focused auto-imported Nuxt component and keep route-level auth-shell composition in the page. Reuse the installed shadcn-vue field, input, and button primitives; add no API calls, state, validation library, or authentication behavior in this slice.

**Tech Stack:** Nuxt 4, Vue 3 `<script setup>`, TypeScript, shadcn-vue/Reka UI, Tailwind CSS 4, Bun

---

## File structure

- Create `app/components/ForgotPasswordForm/index.vue`: reusable static password-recovery form markup and copy.
- Modify `app/pages/auth/forgot-password.vue`: route-level two-column auth shell and form placement.
- Modify `app/components/LoginForm/index.vue`: real Nuxt navigation to password recovery.
- Modify `docs/progress.md`: record completion of the approved isolated UI slice.

### Task 1: Add the forgot-password form component

**Files:**
- Create: `app/components/ForgotPasswordForm/index.vue`

- [ ] **Step 1: Run the component assertion and verify it fails**

```powershell
$path = 'app/components/ForgotPasswordForm/index.vue'
if (-not (Test-Path -LiteralPath $path)) {
  throw "Missing forgot-password form: $path"
}

$source = Get-Content -Raw -LiteralPath $path
$required = @(
  'Восстановление пароля',
  'Отправить ссылку',
  'type="email"',
  'autocomplete="email"',
  'to="/auth"'
)
$missing = $required | Where-Object { -not $source.Contains($_) }
if ($missing) {
  throw "Forgot-password form is missing: $($missing -join ', ')"
}
```

Expected: FAIL with `Missing forgot-password form`.

- [ ] **Step 2: Review the installed shadcn-vue form primitive APIs**

Run:

```powershell
bunx shadcn-vue@latest docs field input button
```

Expected: command prints the official documentation URLs for the installed primitives. Review those pages before composing the form; do not reinstall or overwrite the existing components.

- [ ] **Step 3: Create the minimal form component**

Create `app/components/ForgotPasswordForm/index.vue`:

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
          Восстановление пароля
        </h1>
        <p class="text-muted-foreground text-sm text-balance">
          Введите email, и мы отправим ссылку для сброса пароля
        </p>
      </div>
      <UiField>
        <UiFieldLabel for="email">
          Email
        </UiFieldLabel>
        <UiInput
          id="email"
          type="email"
          size="lg"
          autocomplete="email"
          placeholder="m@example.com"
          required
        />
      </UiField>
      <UiField>
        <UiButton type="submit" class="w-full">
          Отправить ссылку
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

- [ ] **Step 5: Check the component diff**

Run:

```powershell
git diff --check -- app/components/ForgotPasswordForm/index.vue
git diff -- app/components/ForgotPasswordForm/index.vue
```

Expected: no whitespace errors; the diff contains only the new static form.

### Task 2: Wire the route and navigation

**Files:**
- Modify: `app/pages/auth/forgot-password.vue`
- Modify: `app/components/LoginForm/index.vue`

- [ ] **Step 1: Run the route-navigation assertion and verify it fails**

```powershell
$forgotPage = Get-Content -Raw -LiteralPath 'app/pages/auth/forgot-password.vue'
$loginForm = Get-Content -Raw -LiteralPath 'app/components/LoginForm/index.vue'

if (-not $forgotPage.Contains('<ForgotPasswordForm />')) {
  throw 'Forgot-password route does not render ForgotPasswordForm'
}
if (-not $forgotPage.Contains('/images/auth/minerva-auth-visual.png')) {
  throw 'Forgot-password route does not reuse the auth visual'
}
if (-not $loginForm.Contains('to="/auth/forgot-password"')) {
  throw 'Login form does not link to password recovery'
}
```

Expected: FAIL because the route is still an empty stub and the login link is a placeholder anchor.

- [ ] **Step 2: Replace the forgot-password route stub**

Replace `app/pages/auth/forgot-password.vue` with:

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
            <GalleryVerticalEnd />
          </div>
          Минерва
        </NuxtLink>
      </div>
      <div class="flex flex-1 items-center justify-center">
        <div class="w-full max-w-xs">
          <ForgotPasswordForm />
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

- [ ] **Step 3: Replace the placeholder password-recovery anchor in LoginForm**

Replace:

```vue
<a
  href="#"
  class="ml-auto text-sm underline-offset-4 hover:underline"
>
  Забыли пароль?
</a>
```

with:

```vue
<NuxtLink
  to="/auth/forgot-password"
  class="ml-auto text-sm underline-offset-4 hover:underline"
>
  Забыли пароль?
</NuxtLink>
```

- [ ] **Step 4: Re-run the route-navigation assertion**

Run the PowerShell assertion from Step 1.

Expected: command exits successfully with no output.

- [ ] **Step 5: Build the Nuxt application**

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
- Added the approved static password-recovery request screen, matching sign-in styling and linked bidirectionally with `/auth`.
```

- [ ] **Step 2: Refresh Tesserae through the Windows wrapper**

Run:

```powershell
./scripts/refresh-tesserae.ps1
```

Expected: sessions import, compile, and Obsidian sync all report `ok`.

- [ ] **Step 3: Run final scoped verification**

```powershell
$component = Get-Content -Raw -LiteralPath 'app/components/ForgotPasswordForm/index.vue'
$forgotPage = Get-Content -Raw -LiteralPath 'app/pages/auth/forgot-password.vue'
$loginForm = Get-Content -Raw -LiteralPath 'app/components/LoginForm/index.vue'

if (-not $component.Contains('autocomplete="email"')) { throw 'Email autocomplete is missing' }
if (-not $component.Contains('to="/auth"')) { throw 'Return-to-login link is missing' }
if (-not $forgotPage.Contains('<ForgotPasswordForm />')) { throw 'ForgotPasswordForm is not rendered' }
if (-not $loginForm.Contains('to="/auth/forgot-password"')) { throw 'Recovery route link is missing' }

bun run build
git diff --check -- app/components/ForgotPasswordForm/index.vue app/components/LoginForm/index.vue app/pages/auth/forgot-password.vue docs/progress.md
```

Expected: all assertions pass, the build exits with code 0, and `git diff --check` reports no whitespace errors.

- [ ] **Step 4: Review only the files owned by this slice**

Run:

```powershell
git diff -- app/components/ForgotPasswordForm/index.vue app/components/LoginForm/index.vue app/pages/auth/forgot-password.vue docs/progress.md
git status --short
```

Expected: the scoped diff implements the approved UI only. Preserve and do not stage unrelated working-tree changes, `.tesserae`, `.output`, session data, or generated indexes.

- [ ] **Step 5: Commit the completed slice**

```powershell
git add -- app/components/ForgotPasswordForm/index.vue app/components/LoginForm/index.vue app/pages/auth/forgot-password.vue docs/progress.md
git commit -m "ui: add forgot password screen"
```

Expected: commit contains only the four files owned by this slice.
