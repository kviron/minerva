<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AI_CONNECTION_STATUS, AI_PROVIDER } from '../../../../shared/ai-assistant/constants'
import type { ProjectAiConnectionUpsertRequest } from '../../../../shared/ai-assistant/contracts'
import { ProjectAiConnectionActions } from '../model/actions/actions'
import { useProjectAiConnectionStore } from '../model/connection-state'

const props = defineProps<{ projectId: string }>()
const actions = new ProjectAiConnectionActions()
const state = useProjectAiConnectionStore()

const provider = ref<typeof AI_PROVIDER.OPENAI>(AI_PROVIDER.OPENAI)
const model = ref('gpt-5-mini')
const apiKey = ref('')
const enabled = ref(true)
const systemInstructions = ref('')
const maxOutputTokens = ref(2048)
const requestTimeoutMs = ref(30_000)
const resultMessage = ref('')
const disconnectOpen = ref(false)

const connection = computed(() => state.projectId === props.projectId ? state.connection : null)
const pending = computed(() => actions.isPending.value)
const error = computed(() => actions.error.value)
const invalidKey = computed(() => apiKey.value.length > 0 && apiKey.value.trim().length < 16)
const canSave = computed(() => apiKey.value.trim().length >= 16 && model.value.trim().length > 0 && !pending.value)
const statusLabel = computed(() => {
  if (!connection.value) return 'Не подключён'
  if (connection.value.status === AI_CONNECTION_STATUS.VALID) return 'Подключение проверено'
  if (connection.value.status === AI_CONNECTION_STATUS.INVALID) return 'Проверка не пройдена'
  return 'Ожидает проверки'
})

const applyConnectionToForm = () => {
  const current = connection.value
  if (!current) return
  provider.value = current.provider
  model.value = current.model
  enabled.value = current.enabled
  systemInstructions.value = current.systemInstructions ?? ''
  maxOutputTokens.value = current.maxOutputTokens
  requestTimeoutMs.value = current.requestTimeoutMs
  apiKey.value = ''
}

const load = async () => {
  state.clear()
  resultMessage.value = ''
  const response = await actions.load(props.projectId)
  if (!response) return
  state.apply(props.projectId, response.connection)
  applyConnectionToForm()
}

const save = async () => {
  if (!canSave.value) return
  const input: ProjectAiConnectionUpsertRequest = {
    provider: provider.value,
    model: model.value.trim(),
    apiKey: apiKey.value.trim(),
    enabled: enabled.value,
    systemInstructions: systemInstructions.value.trim() || null,
    maxOutputTokens: maxOutputTokens.value,
    requestTimeoutMs: requestTimeoutMs.value,
  }
  const response = await actions.save(props.projectId, input)
  if (!response) return
  state.apply(props.projectId, response.connection)
  apiKey.value = ''
  resultMessage.value = 'Подключение сохранено. Выполните проверку перед использованием.'
}

const testConnection = async () => {
  resultMessage.value = ''
  const response = await actions.test(props.projectId)
  if (!response) return
  state.apply(props.projectId, response.connection)
  resultMessage.value = response.reachable
    ? 'Провайдер и модель доступны.'
    : 'Не удалось подтвердить доступ к провайдеру и модели.'
}

const disconnect = async () => {
  const response = await actions.disconnect(props.projectId)
  if (!response) return
  state.apply(props.projectId, null)
  apiKey.value = ''
  disconnectOpen.value = false
  resultMessage.value = 'Подключение удалено.'
}

watch(() => props.projectId, load, { immediate: true })
</script>

<template>
  <UiCard>
    <UiCardHeader>
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex flex-col gap-1">
          <UiCardTitle>AI-помощник</UiCardTitle>
          <UiCardDescription>Ключ хранится в зашифрованном виде и никогда не возвращается в браузер.</UiCardDescription>
        </div>
        <UiBadge variant="secondary">{{ statusLabel }}</UiBadge>
      </div>
    </UiCardHeader>

    <UiCardContent>
      <UiSkeleton v-if="pending && !connection" class="h-64 w-full" />
      <form v-else class="flex flex-col gap-4" @submit.prevent="save">
        <UiAlert v-if="error" variant="destructive" role="alert">
          <UiAlertTitle>Операция не выполнена</UiAlertTitle>
          <UiAlertDescription>{{ error }}</UiAlertDescription>
        </UiAlert>
        <UiAlert v-if="resultMessage" role="status">
          <UiAlertTitle>Состояние подключения</UiAlertTitle>
          <UiAlertDescription>{{ resultMessage }}</UiAlertDescription>
        </UiAlert>

        <UiFieldGroup>
          <UiField>
            <UiFieldLabel for="ai-provider">Провайдер</UiFieldLabel>
            <UiSelect v-model="provider" :disabled="pending">
              <UiSelectTrigger id="ai-provider"><UiSelectValue placeholder="Выберите провайдера" /></UiSelectTrigger>
              <UiSelectContent>
                <UiSelectGroup><UiSelectItem :value="AI_PROVIDER.OPENAI">OpenAI</UiSelectItem></UiSelectGroup>
              </UiSelectContent>
            </UiSelect>
          </UiField>

          <UiField>
            <UiFieldLabel for="ai-model">Модель</UiFieldLabel>
            <UiInput id="ai-model" v-model="model" autocomplete="off" :disabled="pending" />
            <UiFieldDescription>Например, gpt-5-mini.</UiFieldDescription>
          </UiField>

          <UiField :data-invalid="invalidKey || undefined">
            <UiFieldLabel for="ai-api-key">API-ключ</UiFieldLabel>
            <UiInput id="ai-api-key" v-model="apiKey" type="password" autocomplete="new-password" :aria-invalid="invalidKey || undefined" :disabled="pending" />
            <UiFieldDescription>При сохранении введите ключ заново: сохранённое значение недоступно браузеру.</UiFieldDescription>
          </UiField>

          <UiField>
            <UiFieldLabel for="ai-system-instructions">Инструкции проекта</UiFieldLabel>
            <UiTextarea id="ai-system-instructions" v-model="systemInstructions" :maxlength="4000" :disabled="pending" />
            <UiFieldDescription>Не добавляйте сюда пароли и другие секреты.</UiFieldDescription>
          </UiField>

          <div class="grid gap-4 md:grid-cols-2">
            <UiField>
              <UiFieldLabel for="ai-max-output-tokens">Максимум токенов ответа</UiFieldLabel>
              <UiInput id="ai-max-output-tokens" v-model.number="maxOutputTokens" type="number" min="128" max="8192" :disabled="pending" />
            </UiField>
            <UiField>
              <UiFieldLabel for="ai-timeout">Таймаут запроса, мс</UiFieldLabel>
              <UiInput id="ai-timeout" v-model.number="requestTimeoutMs" type="number" min="5000" max="120000" step="1000" :disabled="pending" />
            </UiField>
          </div>

          <UiField orientation="horizontal" :data-disabled="pending || undefined">
            <UiFieldContent>
              <UiFieldLabel for="ai-enabled">Разрешить использование подключения</UiFieldLabel>
              <UiFieldDescription>Отключённое подключение сохраняет настройки, но не обслуживает запросы.</UiFieldDescription>
            </UiFieldContent>
            <UiSwitch id="ai-enabled" v-model="enabled" :disabled="pending" />
          </UiField>
        </UiFieldGroup>

        <div class="flex flex-wrap justify-end gap-2">
          <UiButton v-if="connection" type="button" variant="outline" :disabled="pending" @click="testConnection">
            <UiSpinner v-if="pending" data-icon="inline-start" />Проверить
          </UiButton>
          <UiButton type="submit" :disabled="!canSave">
            <UiSpinner v-if="pending" data-icon="inline-start" />Сохранить подключение
          </UiButton>
        </div>
      </form>
    </UiCardContent>

    <UiCardFooter v-if="connection" class="justify-between gap-3">
      <p class="text-sm text-muted-foreground">
        Последняя проверка: {{ connection.lastValidatedAt ? new Date(connection.lastValidatedAt).toLocaleString('ru-RU') : 'не выполнялась' }}
      </p>
      <UiButton type="button" variant="destructive" :disabled="pending" @click="disconnectOpen = true">Отключить</UiButton>
    </UiCardFooter>

    <UiAlertDialog v-model:open="disconnectOpen">
      <UiAlertDialogContent>
        <UiAlertDialogHeader>
          <UiAlertDialogTitle>Отключить AI-провайдера?</UiAlertDialogTitle>
          <UiAlertDialogDescription>Зашифрованный ключ будет удалён. Для повторного подключения потребуется новый ключ.</UiAlertDialogDescription>
        </UiAlertDialogHeader>
        <UiAlertDialogFooter>
          <UiAlertDialogCancel :disabled="pending">Отмена</UiAlertDialogCancel>
          <UiButton variant="destructive" :disabled="pending" @click="disconnect">
            <UiSpinner v-if="pending" data-icon="inline-start" />Отключить
          </UiButton>
        </UiAlertDialogFooter>
      </UiAlertDialogContent>
    </UiAlertDialog>
  </UiCard>
</template>
