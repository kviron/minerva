<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"
import { useResetPasswordForm } from "../model/use-reset-password-form"

const props = defineProps<{
  class?: HTMLAttributes["class"]
  token: string
}>()

const {
  password,
  passwordAttrs,
  passwordError,
  confirmation,
  confirmationAttrs,
  confirmationError,
  submitError,
  passwordInvalid,
  confirmationInvalid,
  isSubmitting,
  submit,
} = useResetPasswordForm(() => props.token)
</script>

<template>
  <form :class="cn('flex flex-col gap-6', props.class)" @submit.prevent="submit">
    <UiFieldGroup>
      <div class="flex flex-col items-center gap-1 text-center">
        <h1 class="text-2xl font-bold">
          Новый пароль
        </h1>
        <p class="text-muted-foreground text-sm text-balance">
          Введите новый пароль дважды, чтобы подтвердить его
        </p>
      </div>
      <UiField :data-invalid="passwordInvalid ? true : undefined">
        <UiFieldLabel for="new-password">
          Новый пароль
        </UiFieldLabel>
        <UiInput
          id="new-password"
          v-model="password"
          v-bind="passwordAttrs"
          type="password"
          size="lg"
          autocomplete="new-password"
          :aria-invalid="passwordInvalid"
          required
        />
        <UiFieldError v-if="passwordError" :errors="[passwordError]" />
      </UiField>
      <UiField :data-invalid="confirmationInvalid ? true : undefined">
        <UiFieldLabel for="confirm-password">
          Подтвердите пароль
        </UiFieldLabel>
        <UiInput
          id="confirm-password"
          v-model="confirmation"
          v-bind="confirmationAttrs"
          type="password"
          size="lg"
          autocomplete="new-password"
          :aria-invalid="confirmationInvalid"
          required
        />
        <UiFieldError v-if="confirmationError" :errors="[confirmationError]" />
      </UiField>
      <UiField v-if="submitError" data-invalid>
        <UiFieldError :errors="[submitError]" />
      </UiField>
      <UiField>
        <UiButton type="submit" class="w-full" :disabled="isSubmitting">
          <UiSpinner v-if="isSubmitting" data-icon="inline-start" />
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
