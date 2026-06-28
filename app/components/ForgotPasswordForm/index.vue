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
