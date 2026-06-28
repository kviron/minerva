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
          Войти в ваш аккаунт
        </h1>
        <p class="text-muted-foreground text-sm text-balance">
          Введите логин или email, чтобы войти в свою учетную запись
        </p>
      </div>
      <UiField>
        <UiFieldLabel for="email">
          Email или Логин
        </UiFieldLabel>
        <UiInput id="email" type="text" size="lg" placeholder="m@example.com" required />
      </UiField>
      <UiField>
        <div class="flex items-center">
          <UiFieldLabel for="password">
            Пароль
          </UiFieldLabel>
          <NuxtLink
            to="/auth/forgot-password"
            class="ml-auto text-sm underline-offset-4 hover:underline"
          >
            Забыли пароль?
          </NuxtLink>
        </div>
        <UiInput id="password" type="password" size="lg" required />
      </UiField>
      <UiField>
        <UiButton type="submit" class="w-full">
          Войти
        </UiButton>
      </UiField>
    </UiFieldGroup>
  </form>
</template>
