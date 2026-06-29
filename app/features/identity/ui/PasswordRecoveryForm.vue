<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"
import { usePasswordRecoveryForm } from "../model/use-password-recovery-form"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()

const {
  email, emailAttrs, errorMessage, statusMessage, isSubmitting, submit,
} = usePasswordRecoveryForm()
</script>

<template>
  <form :class="cn('flex flex-col gap-6', props.class)" @submit.prevent="submit">
    <UiFieldGroup>
      <div class="flex flex-col items-center gap-1 text-center">
        <h1 class="text-2xl font-bold">
          Восстановление пароля
        </h1>
        <p class="text-muted-foreground text-sm text-balance">
          Введите email, и мы отправим ссылку для сброса пароля
        </p>
      </div>
      <UiField :data-invalid="errorMessage ? true : undefined">
        <UiFieldLabel for="email">
          Email
        </UiFieldLabel>
        <UiInput
          id="email"
          v-model="email"
          v-bind="emailAttrs"
          type="email"
          size="lg"
          autocomplete="email"
          placeholder="m@example.com"
          :aria-invalid="Boolean(errorMessage)"
          required
        />
        <UiFieldError v-if="errorMessage" :errors="[errorMessage]" />
        <UiFieldDescription v-if="statusMessage" role="status">
          {{ statusMessage }}
        </UiFieldDescription>
      </UiField>
      <UiField>
        <UiButton type="submit" class="w-full" :disabled="isSubmitting">
          <UiSpinner v-if="isSubmitting" data-icon="inline-start" />
          Отправить ссылку
        </UiButton>
      </UiField>
      <UiField>
        <p class="text-center text-xs/relaxed">
          <NuxtLink to="/auth" class="underline-offset-4 hover:underline">
            Вернуться ко входу
          </NuxtLink>
        </p>
      </UiField>
    </UiFieldGroup>
  </form>
</template>
