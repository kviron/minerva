<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { OAuthGrantSummary } from '../../../../shared/oauth-grants/contracts'
import { oauthGrantsApi } from '../api/oauth-grants-api'
import { getOAuthScopeLabel } from '../model/scope-labels'

const grants = ref<OAuthGrantSummary[]>([])
const pending = ref(true)
const error = ref<string | null>(null)
const revokingId = ref<string | null>(null)

const load = async () => {
  pending.value = true
  error.value = null
  try {
    grants.value = [...await oauthGrantsApi.list()]
  } catch {
    error.value = 'Не удалось загрузить подключения.'
  } finally {
    pending.value = false
  }
}

const revoke = async (grant: OAuthGrantSummary) => {
  revokingId.value = grant.id
  error.value = null
  try {
    await oauthGrantsApi.revoke(grant)
    grants.value = grants.value.filter(item => item.id !== grant.id)
  } catch {
    error.value = 'Не удалось отозвать доступ. Обновите список и попробуйте снова.'
  } finally {
    revokingId.value = null
  }
}

const formatDate = (value: string) => new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value))

onMounted(load)
</script>

<template>
  <section class="flex flex-col gap-4 px-4 lg:px-6">
    <div>
      <h2 class="text-xl font-semibold">Подключённые приложения</h2>
      <p class="text-sm text-muted-foreground">
        Приложения и AI-клиенты, которым вы разрешили работать с Minerva от вашего имени.
      </p>
    </div>

    <div v-if="pending" class="grid gap-3">
      <UiSkeleton v-for="row in 2" :key="row" class="h-36 w-full" />
    </div>

    <UiAlert v-else-if="error" variant="destructive" role="alert">
      <UiAlertTitle>Ошибка подключения</UiAlertTitle>
      <UiAlertDescription>{{ error }}</UiAlertDescription>
      <UiAlertAction><UiButton variant="outline" size="sm" @click="load">Обновить</UiButton></UiAlertAction>
    </UiAlert>

    <UiEmpty v-else-if="grants.length === 0" class="border border-dashed">
      <UiEmptyHeader>
        <UiEmptyTitle>Нет активных подключений</UiEmptyTitle>
        <UiEmptyDescription>Разрешённые AI-клиенты появятся здесь.</UiEmptyDescription>
      </UiEmptyHeader>
    </UiEmpty>

    <div v-else class="grid gap-3">
      <UiCard v-for="grant in grants" :key="grant.id">
        <UiCardHeader>
          <UiCardTitle>{{ grant.client.name }}</UiCardTitle>
          <UiCardDescription>Подключено {{ formatDate(grant.createdAt) }}</UiCardDescription>
        </UiCardHeader>
        <UiCardContent class="flex flex-col gap-3">
          <div class="flex flex-wrap gap-2">
            <UiBadge v-for="scope in grant.scopes" :key="scope" variant="secondary">
              {{ getOAuthScopeLabel(scope) }}
            </UiBadge>
          </div>
          <p class="break-all text-xs text-muted-foreground">{{ grant.resource }}</p>
          <div>
            <UiButton
              variant="destructive"
              size="sm"
              :disabled="revokingId === grant.id"
              @click="revoke(grant)"
            >
              {{ revokingId === grant.id ? 'Отзываем…' : 'Отозвать доступ' }}
            </UiButton>
          </div>
        </UiCardContent>
      </UiCard>
    </div>
  </section>
</template>
