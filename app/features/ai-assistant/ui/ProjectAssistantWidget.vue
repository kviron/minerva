<script setup lang="ts">
import {
  ArchiveIcon,
  ArrowLeftIcon,
  BotIcon,
  HistoryIcon,
  RotateCcwIcon,
  SendIcon,
  SparklesIcon,
  SquarePenIcon,
  StopCircleIcon,
  Trash2Icon,
} from '@lucide/vue'
import { computed, nextTick, ref, watch } from 'vue'
import type {
  ProjectAiAvailabilityResponse,
  ProjectAssistantStreamEvent,
} from '../../../../shared/ai-assistant/contracts'
import {
  AI_ASSISTANT_AVAILABILITY,
  AI_CONVERSATION_STATUS,
  AI_ASSISTANT_STREAM_ERROR,
  AI_ASSISTANT_STREAM_EVENT,
  AI_QUESTION_MAX_LENGTH,
} from '../../../../shared/ai-assistant/constants'
import {
  PROJECT_ASSISTANT_MESSAGE_ROLE,
  PROJECT_ASSISTANT_MESSAGE_STATUS,
  useProjectAssistantStore,
} from '../model/assistant-state'
import { useProjectAssistantActions } from '../model/actions/assistant-provider'
import { PROJECT_ASSISTANT_ACTION } from '../model/actions/assistant-actions'

const { projectId, projectName, canManageAssistant } = defineProps<{
  projectId: string
  projectName: string
  canManageAssistant: boolean
}>()

const actions = useProjectAssistantActions()
const store = useProjectAssistantStore()
const composer = ref('')
const availability = ref<ProjectAiAvailabilityResponse['availability'] | null>(null)
const isOpen = computed(() => store.projectId === projectId && store.isOpen)
const isStreaming = computed(() => store.projectId === projectId && store.activeAssistantMessageId !== null)
const isAssistantReady = computed(() => availability.value === AI_ASSISTANT_AVAILABILITY.READY)
const isAvailabilityLoading = computed(() => actions.isPendingFor(
  PROJECT_ASSISTANT_ACTION.LOAD_AVAILABILITY,
  projectId,
))
const historyStatus = ref<typeof AI_CONVERSATION_STATUS[keyof typeof AI_CONVERSATION_STATUS] | null>(null)
const isHistoryOpen = computed(() => historyStatus.value !== null)
const isHistoryLoading = computed(() => historyStatus.value !== null && actions.isPendingFor(
  PROJECT_ASSISTANT_ACTION.LIST_CONVERSATIONS,
  `${projectId}:${historyStatus.value}`,
))

const availabilityCopy = computed(() => {
  if (availability.value === AI_ASSISTANT_AVAILABILITY.NOT_CONFIGURED) {
    return {
      title: 'AI-помощник ещё не настроен',
      description: 'Администратору проекта нужно подключить и проверить AI-провайдера.',
    }
  }
  if (availability.value === AI_ASSISTANT_AVAILABILITY.DISABLED) {
    return {
      title: 'AI-помощник отключён',
      description: 'Подключение сохранено, но использование AI-провайдера выключено.',
    }
  }
  if (availability.value === AI_ASSISTANT_AVAILABILITY.NEEDS_VALIDATION) {
    return {
      title: 'Подключение требует проверки',
      description: 'Проверьте подключение AI-провайдера в настройках проекта.',
    }
  }
  return null
})

const loadAvailability = async (): Promise<void> => {
  availability.value = null
  const result = await actions.loadAvailability(projectId)
  if (result && store.projectId === projectId) {
    availability.value = result.availability
    if (result.availability === AI_ASSISTANT_AVAILABILITY.READY && isOpen.value) {
      await nextTick()
      focusComposerElement()
    }
  }
}

const streamErrorMessage = (code: typeof AI_ASSISTANT_STREAM_ERROR[keyof typeof AI_ASSISTANT_STREAM_ERROR]): string => {
  if (code === AI_ASSISTANT_STREAM_ERROR.PERMISSION_DENIED) return 'Доступ к AI-помощнику был отозван.'
  if (code === AI_ASSISTANT_STREAM_ERROR.INVALID_RESPONSE) return 'AI-провайдер вернул некорректный ответ.'
  return 'AI-провайдер временно недоступен.'
}

const focusComposerElement = (): void => {
  const element = document.querySelector(`[data-project-assistant-composer="${projectId}"]`)
  if (element instanceof HTMLElement) element.focus()
}

const focusComposer = async (event: Event) => {
  event.preventDefault()
  await nextTick()
  focusComposerElement()
}

const applyStreamEvent = (messageId: string, event: ProjectAssistantStreamEvent): void => {
  if (store.projectId !== projectId || store.activeAssistantMessageId !== messageId) return
  if (event.type === AI_ASSISTANT_STREAM_EVENT.CONTEXT) {
    store.setTurnCitations(messageId, event.citations)
  }
  else if (event.type === AI_ASSISTANT_STREAM_EVENT.DELTA) {
    store.appendDelta(messageId, event.delta)
  }
  else if (event.type === AI_ASSISTANT_STREAM_EVENT.COMPLETED) {
    store.completeTurn(messageId, event.citations)
  }
  else if (event.code === AI_ASSISTANT_STREAM_ERROR.CANCELLED) {
    store.cancelTurn(messageId)
  }
  else {
    store.failTurn(messageId, streamErrorMessage(event.code))
  }
}

const runQuestion = async (rawQuestion: string, isRetry = false): Promise<void> => {
  const question = rawQuestion.trim()
  if (!question || isStreaming.value || !isAssistantReady.value) return

  let conversationId = store.conversationId
  if (conversationId === null) {
    const created = await actions.createConversation(projectId)
    if (!created) return
    conversationId = created.conversation.id
    store.selectConversation(conversationId)
  }
  const userMessageId = `${globalThis.crypto.randomUUID()}-user`
  const assistantMessageId = `${globalThis.crypto.randomUUID()}-assistant`
  store.startTurn({ userMessageId, assistantMessageId, question })
  composer.value = ''
  const onEvent = (event: ProjectAssistantStreamEvent) => applyStreamEvent(assistantMessageId, event)

  if (isRetry) await actions.retry(projectId, conversationId, question, onEvent)
  else await actions.send(projectId, conversationId, question, onEvent)

  if (store.projectId === projectId && store.activeAssistantMessageId === assistantMessageId) {
    store.failTurn(assistantMessageId, actions.error.value ?? 'Поток ответа неожиданно завершился.')
  }
}

const send = (): Promise<void> => runQuestion(composer.value)

const retry = async (): Promise<void> => {
  const question = store.retryQuestion
  if (question) await runQuestion(question, true)
}

const showConversation = (): void => {
  historyStatus.value = null
}

const loadConversationList = async (
  status: typeof AI_CONVERSATION_STATUS[keyof typeof AI_CONVERSATION_STATUS],
  append = false,
): Promise<void> => {
  historyStatus.value = status
  if (!append) store.setConversations([], null)
  const cursor = append ? store.conversationsNextCursor ?? undefined : undefined
  const page = await actions.listConversations(projectId, status, cursor)
  if (page) store.setConversations(page.conversations, page.nextCursor, append)
}

const selectConversation = async (conversationId: string): Promise<void> => {
  store.selectConversation(conversationId)
  const page = await actions.loadMessages(projectId, conversationId, undefined)
  if (page) store.hydrateMessages(page.messages, page.nextCursor)
  showConversation()
}

const loadOlderMessages = async (): Promise<void> => {
  if (!store.conversationId || !store.messagesNextCursor) return
  const page = await actions.loadMessages(projectId, store.conversationId, store.messagesNextCursor)
  if (page) store.hydrateMessages(page.messages, page.nextCursor, true)
}

const archiveCurrentConversation = async (): Promise<void> => {
  if (!store.conversationId || isStreaming.value) return
  const result = await actions.archiveConversation(projectId, store.conversationId)
  if (result) startNewConversation()
}

const restoreConversation = async (conversationId: string): Promise<void> => {
  const result = await actions.restoreConversation(projectId, conversationId)
  if (result) await loadConversationList(AI_CONVERSATION_STATUS.TRASH)
}

const cancel = (): void => {
  actions.cancel(projectId)
  const messageId = store.activeAssistantMessageId
  if (messageId) store.cancelTurn(messageId)
}

const open = (): void => {
  const command = actions.open(projectId)
  if (command) {
    store.open(command.projectId)
    void loadAvailability()
  }
}

const startNewConversation = (): void => {
  actions.cancel(projectId)
  const command = actions.newConversation(projectId)
  if (command) store.newConversation(command.projectId)
  composer.value = ''
  historyStatus.value = null
}

const setOpen = (value: boolean): void => {
  if (value) open()
  else store.close()
}

const handleComposerKeydown = (event: KeyboardEvent): void => {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return
  event.preventDefault()
  void send()
}

watch(() => projectId, (nextProjectId) => {
  const previousProjectId = store.projectId
  if (previousProjectId && previousProjectId !== nextProjectId) actions.cancel(previousProjectId)
  store.activateProject(nextProjectId)
  availability.value = null
}, { immediate: true })
</script>

<template>
  <UiButton
    class="fixed right-6 bottom-6 shadow-lg"
    size="lg"
    aria-label="Открыть AI-помощника"
    @click="open"
  >
    <SparklesIcon data-icon="inline-start" />
    AI-помощник
  </UiButton>

  <UiSheet :open="isOpen" @update:open="setOpen">
    <UiSheetContent
      class="w-full gap-0 p-0 sm:max-w-md"
      @open-auto-focus="focusComposer"
    >
      <UiSheetHeader class="border-b pr-14">
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 flex-col gap-1">
            <UiSheetTitle>AI-помощник</UiSheetTitle>
            <UiSheetDescription class="truncate">
              Отвечает по документации проекта «{{ projectName }}»
            </UiSheetDescription>
          </div>
          <UiButton
            variant="ghost"
            size="icon-sm"
            title="Новый разговор"
            aria-label="Новый разговор"
            @click="startNewConversation"
          >
            <SquarePenIcon />
          </UiButton>
          <UiDropdownMenu>
            <UiDropdownMenuTrigger as-child>
              <UiButton variant="ghost" size="icon-sm" aria-label="История разговоров"><HistoryIcon /></UiButton>
            </UiDropdownMenuTrigger>
            <UiDropdownMenuContent align="end">
              <UiDropdownMenuItem @select="loadConversationList(AI_CONVERSATION_STATUS.ACTIVE)">
                <HistoryIcon /> История
              </UiDropdownMenuItem>
              <UiDropdownMenuItem @select="loadConversationList(AI_CONVERSATION_STATUS.TRASH)">
                <Trash2Icon /> Корзина
              </UiDropdownMenuItem>
              <UiDropdownMenuSeparator v-if="store.conversationId" />
              <UiDropdownMenuItem v-if="store.conversationId" :disabled="isStreaming" @select="archiveCurrentConversation">
                <ArchiveIcon /> Удалить в корзину
              </UiDropdownMenuItem>
            </UiDropdownMenuContent>
          </UiDropdownMenu>
        </div>
      </UiSheetHeader>

      <div v-if="isHistoryOpen" class="flex min-h-0 flex-1 flex-col">
        <div class="flex items-center gap-2 border-b px-4 py-3">
          <UiButton variant="ghost" size="icon-sm" aria-label="Вернуться к разговору" @click="showConversation"><ArrowLeftIcon /></UiButton>
          <h3 class="font-medium">{{ historyStatus === AI_CONVERSATION_STATUS.TRASH ? 'Корзина' : 'История разговоров' }}</h3>
        </div>
        <div class="flex-1 overflow-y-auto p-3">
          <div v-if="isHistoryLoading && store.conversations.length === 0" class="flex flex-col gap-3 p-2" aria-label="Загрузка истории">
            <UiSkeleton class="h-10 w-full" />
            <UiSkeleton class="h-10 w-4/5" />
            <UiSkeleton class="h-10 w-full" />
          </div>
          <UiEmpty v-else-if="store.conversations.length === 0" class="min-h-64">
            <UiEmptyHeader>
              <UiEmptyMedia variant="icon"><HistoryIcon /></UiEmptyMedia>
              <UiEmptyTitle>Разговоров пока нет</UiEmptyTitle>
            </UiEmptyHeader>
          </UiEmpty>
          <div v-else class="flex flex-col gap-1">
            <div v-for="conversation in store.conversations" :key="conversation.id" class="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted">
              <UiButton class="h-auto min-w-0 flex-1 justify-start whitespace-normal py-2 text-left" variant="ghost" @click="selectConversation(conversation.id)">
                {{ conversation.title }}
              </UiButton>
              <UiButton v-if="historyStatus === AI_CONVERSATION_STATUS.TRASH" variant="ghost" size="icon-sm" aria-label="Восстановить разговор" @click="restoreConversation(conversation.id)"><RotateCcwIcon /></UiButton>
            </div>
            <UiButton v-if="store.conversationsNextCursor" class="mt-2" variant="outline" @click="historyStatus && loadConversationList(historyStatus, true)">Показать ещё</UiButton>
          </div>
        </div>
      </div>

      <UiMessageScrollerProvider v-else auto-scroll default-scroll-position="end">
        <UiMessageScroller class="flex-1">
          <UiMessageScrollerViewport>
            <UiMessageScrollerContent class="gap-4 px-4 py-5">
              <div
                v-if="isAvailabilityLoading && availability === null"
                class="flex flex-col gap-2"
                aria-label="Проверка подключения AI-помощника"
              >
                <UiSkeleton class="h-4 w-3/5" />
                <UiSkeleton class="h-4 w-4/5" />
              </div>
              <UiAlert v-else-if="availabilityCopy">
                <UiAlertTitle>{{ availabilityCopy.title }}</UiAlertTitle>
                <UiAlertDescription>{{ availabilityCopy.description }}</UiAlertDescription>
                <UiButton
                  v-if="canManageAssistant"
                  class="mt-3"
                  variant="outline"
                  size="sm"
                  as-child
                >
                  <NuxtLink :to="`/projects/${projectId}/settings?tab=ai-assistant`">
                    Открыть настройки
                  </NuxtLink>
                </UiButton>
              </UiAlert>
              <UiAlert v-else-if="availability === null && actions.error.value">
                <UiAlertTitle>Не удалось проверить AI-помощника</UiAlertTitle>
                <UiAlertDescription>{{ actions.error.value }}</UiAlertDescription>
                <UiButton class="mt-3" variant="outline" size="sm" @click="loadAvailability">
                  <RotateCcwIcon data-icon="inline-start" />
                  Повторить
                </UiButton>
              </UiAlert>
              <UiButton v-if="store.messagesNextCursor" variant="ghost" size="sm" @click="loadOlderMessages">Показать предыдущие сообщения</UiButton>
              <UiEmpty v-if="store.messages.length === 0 && isAssistantReady" class="min-h-72">
                <UiEmptyHeader>
                  <UiEmptyMedia variant="icon"><BotIcon /></UiEmptyMedia>
                  <UiEmptyTitle>Спросите о документации</UiEmptyTitle>
                  <UiEmptyDescription>
                    Помощник использует только доступные вам страницы текущего проекта.
                  </UiEmptyDescription>
                </UiEmptyHeader>
              </UiEmpty>

              <UiMessageScrollerItem
                v-for="message in store.messages"
                :key="message.id"
                :message-id="message.id"
                :scroll-anchor="message.role === PROJECT_ASSISTANT_MESSAGE_ROLE.USER"
              >
                <div
                  v-if="message.role === PROJECT_ASSISTANT_MESSAGE_ROLE.USER"
                  class="ml-10 rounded-lg bg-primary px-3 py-2 text-primary-foreground"
                >
                  <p class="whitespace-pre-wrap">{{ message.content }}</p>
                </div>

                <div v-else class="mr-6 flex flex-col gap-3">
                  <div
                    v-if="message.status === PROJECT_ASSISTANT_MESSAGE_STATUS.STREAMING && !message.content"
                    class="flex flex-col gap-2"
                    aria-label="AI-помощник формирует ответ"
                  >
                    <div class="flex items-center gap-2 text-muted-foreground">
                      <UiSpinner />
                      <span>Ищу ответ в документации…</span>
                    </div>
                    <UiSkeleton class="h-3 w-4/5" />
                    <UiSkeleton class="h-3 w-3/5" />
                  </div>
                  <p v-else-if="message.content" class="whitespace-pre-wrap text-sm leading-relaxed">
                    {{ message.content }}
                  </p>

                  <UiAlert v-if="message.status === PROJECT_ASSISTANT_MESSAGE_STATUS.CANCELLED">
                    <UiAlertTitle>Ответ остановлен</UiAlertTitle>
                    <UiAlertDescription>Можно повторить последний вопрос.</UiAlertDescription>
                    <UiButton class="mt-3" variant="outline" size="sm" @click="retry">
                      <RotateCcwIcon data-icon="inline-start" />
                      Повторить
                    </UiButton>
                  </UiAlert>

                  <div v-if="message.citations.length" class="flex flex-wrap gap-2" aria-label="Источники">
                    <UiBadge
                      v-for="citation in message.citations"
                      :key="citation.documentId"
                      as-child
                      variant="outline"
                    >
                      <NuxtLink :to="`/projects/${projectId}/documents/${citation.documentId}`">
                        {{ citation.title }}
                      </NuxtLink>
                    </UiBadge>
                  </div>
                </div>
              </UiMessageScrollerItem>

              <UiAlert v-if="store.error" variant="destructive">
                <UiAlertTitle>Не удалось получить ответ</UiAlertTitle>
                <UiAlertDescription>{{ store.error }}</UiAlertDescription>
                <UiButton class="mt-3" variant="outline" size="sm" @click="retry">
                  <RotateCcwIcon data-icon="inline-start" />
                  Повторить
                </UiButton>
              </UiAlert>
            </UiMessageScrollerContent>
          </UiMessageScrollerViewport>
          <UiMessageScrollerButton />
        </UiMessageScroller>
      </UiMessageScrollerProvider>

      <UiSheetFooter v-if="!isHistoryOpen" class="border-t">
        <UiInputGroup>
          <UiInputGroupTextarea
            v-model="composer"
            :data-project-assistant-composer="projectId"
            :maxlength="AI_QUESTION_MAX_LENGTH"
            :disabled="isStreaming || !isAssistantReady"
            aria-label="Вопрос AI-помощнику"
            placeholder="Спросите о документации…"
            rows="3"
            @keydown="handleComposerKeydown"
          />
          <UiInputGroupAddon align="block-end" class="justify-between">
            <span>Enter — отправить, Shift+Enter — новая строка</span>
            <UiInputGroupButton
              v-if="isStreaming"
              variant="outline"
              size="icon-sm"
              aria-label="Остановить ответ"
              @click="cancel"
            >
              <StopCircleIcon />
            </UiInputGroupButton>
            <UiInputGroupButton
              v-else
              variant="default"
              size="icon-sm"
              :disabled="!composer.trim() || !isAssistantReady"
              aria-label="Отправить вопрос"
              @click="send"
            >
              <SendIcon />
            </UiInputGroupButton>
          </UiInputGroupAddon>
        </UiInputGroup>
      </UiSheetFooter>
    </UiSheetContent>
  </UiSheet>
</template>
