<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()

const identifier = ref("")
const password = ref("")
const pending = ref(false)
const errorMessage = ref("")

async function submit() {
  pending.value = true
  errorMessage.value = ""

  try {
    await $fetch("/api/identity/sign-in", {
      method: "POST",
      body: { identifier: identifier.value, password: password.value },
    })
    await navigateTo("/")
  }
  catch {
    errorMessage.value = "Неверный логин или пароль"
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <form :class="cn('flex flex-col gap-6', props.class)" @submit.prevent="submit">
    <UiFieldGroup>
      <div class="flex flex-col items-center gap-1 text-center">
        <h1 class="text-2xl font-bold">
          Войти в ваш аккаунт
        </h1>
        <p class="text-muted-foreground text-sm text-balance">
          Введите логин или email, чтобы войти в свою учётную запись
        </p>
      </div>
      <UiField :data-invalid="errorMessage ? true : undefined">
        <UiFieldLabel for="email">
          Email или логин
        </UiFieldLabel>
        <UiInput
          id="email"
          v-model="identifier"
          type="text"
          size="lg"
          autocomplete="username"
          placeholder="m@example.com"
          :aria-invalid="Boolean(errorMessage)"
          required
        />
      </UiField>
      <UiField :data-invalid="errorMessage ? true : undefined">
        <div class="flex items-center">
          <UiFieldLabel for="password">
            Пароль
          </UiFieldLabel>
          <NuxtLink
            to="/auth/forgot-password"
            class="ml-auto text-xs/relaxed underline-offset-4 hover:underline"
          >
            Забыли пароль?
          </NuxtLink>
        </div>
        <UiInput
          id="password"
          v-model="password"
          type="password"
          size="lg"
          autocomplete="current-password"
          :aria-invalid="Boolean(errorMessage)"
          required
        />
        <UiFieldError v-if="errorMessage" :errors="[errorMessage]" />
      </UiField>
      <UiField>
        <UiButton type="submit" class="w-full" :disabled="pending">
          <UiSpinner v-if="pending" data-icon="inline-start" />
          Войти
        </UiButton>
      </UiField>
    </UiFieldGroup>
  </form>
</template>
