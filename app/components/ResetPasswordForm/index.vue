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
