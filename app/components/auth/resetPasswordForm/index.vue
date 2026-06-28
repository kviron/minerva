<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()

const route = useRoute()
const password = ref("")
const confirmation = ref("")
const pending = ref(false)
const errorMessage = ref("")

async function submit() {
  errorMessage.value = ""
  if (password.value.length < 12 || password.value.length > 256) {
    errorMessage.value = "Пароль должен содержать от 12 до 256 символов"
    return
  }
  if (password.value !== confirmation.value) {
    errorMessage.value = "Пароли не совпадают"
    return
  }

  pending.value = true
  try {
    await $fetch("/api/identity/reset-password", {
      method: "POST",
      body: { token: String(route.params.token ?? ""), newPassword: password.value },
    })
    await navigateTo("/auth")
  }
  catch {
    errorMessage.value = "Ссылка недействительна или уже использована"
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
          Новый пароль
        </h1>
        <p class="text-muted-foreground text-sm text-balance">
          Введите новый пароль дважды, чтобы подтвердить его
        </p>
      </div>
      <UiField :data-invalid="errorMessage ? true : undefined">
        <UiFieldLabel for="new-password">
          Новый пароль
        </UiFieldLabel>
        <UiInput
          id="new-password"
          v-model="password"
          type="password"
          size="lg"
          autocomplete="new-password"
          :aria-invalid="Boolean(errorMessage)"
          required
        />
      </UiField>
      <UiField :data-invalid="errorMessage ? true : undefined">
        <UiFieldLabel for="confirm-password">
          Подтвердите пароль
        </UiFieldLabel>
        <UiInput
          id="confirm-password"
          v-model="confirmation"
          type="password"
          size="lg"
          autocomplete="new-password"
          :aria-invalid="Boolean(errorMessage)"
          required
        />
        <UiFieldError v-if="errorMessage" :errors="[errorMessage]" />
      </UiField>
      <UiField>
        <UiButton type="submit" class="w-full" :disabled="pending">
          <UiSpinner v-if="pending" data-icon="inline-start" />
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
