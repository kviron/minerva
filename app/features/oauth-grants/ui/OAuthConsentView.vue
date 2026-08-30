<script setup lang="ts">
import { ref } from 'vue'
import { oauthConsentApi } from '../api/oauth-consent-api'
import type { OAuthConsentRequest } from '../model/consent-request'
import { getOAuthScopeLabel } from '../model/scope-labels'

const props = defineProps<{
  request: OAuthConsentRequest
  oauthQuery: string
}>()

const pending = ref(false)
const error = ref<string | null>(null)

const decide = async (decision: boolean) => {
  pending.value = true
  error.value = null
  try {
    const result = await oauthConsentApi.decide({ accept: decision, oauthQuery: props.oauthQuery })
    await navigateTo(result.url, { external: true })
  } catch {
    error.value = 'Не удалось обработать запрос доступа. Вернитесь в приложение и попробуйте подключиться снова.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <main class="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-10">
    <UiCard class="w-full">
      <UiCardHeader>
        <UiCardTitle>{{ request.clientId }}</UiCardTitle>
        <UiCardDescription>Запрашивает доступ к Minerva от вашего имени.</UiCardDescription>
      </UiCardHeader>
      <UiCardContent class="flex flex-col gap-4">
        <div>
          <h2 class="mb-2 text-sm font-medium">Приложение сможет:</h2>
          <ul class="flex flex-col gap-2 text-sm">
            <li v-for="scope in request.scopes" :key="scope" class="rounded-md border px-3 py-2">
              {{ getOAuthScopeLabel(scope) }}
            </li>
          </ul>
        </div>

        <UiAlert v-if="error" variant="destructive" role="alert">
          <UiAlertTitle>Авторизация не завершена</UiAlertTitle>
          <UiAlertDescription>{{ error }}</UiAlertDescription>
        </UiAlert>
      </UiCardContent>
      <UiCardFooter class="justify-end gap-2">
        <UiButton variant="outline" :disabled="pending" @click="decide(false)">Отказать</UiButton>
        <UiButton :disabled="pending" @click="decide(true)">Разрешить</UiButton>
      </UiCardFooter>
    </UiCard>
  </main>
</template>
