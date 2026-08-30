<script setup lang="ts">
import { Rocket } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useProjectOverviewStore } from '@/features/projects'
import type { DocumentDetailResponse, DocumentVersionSummary } from '../../../../shared/documents/contracts'
import { DOCUMENT_DRAFT_UPDATE_CODE } from '../../../../shared/documents/constants'
import { PROJECT_PERMISSION } from '../../../../shared/projects/constants'
import { DOCUMENT_ACTION } from '../model/actions/actions'
import { useDocumentsActions } from '../model/actions/provider'
import { useDocumentsStore } from '../model/documents-state'
import { formatDocumentUpdatedAt } from '../model/presentation'
import DocumentContentNode from './DocumentContentNode.vue'
import DocumentDetailsPanel from './DocumentDetailsPanel.vue'

const props = defineProps<{
  projectId: string
  document: DocumentDetailResponse
}>()

const actions = useDocumentsActions()
const state = useDocumentsStore()
const projectState = useProjectOverviewStore()
const publishOpen = ref(false)
const historyLoaded = ref(false)
const versionPreviewOpen = ref(false)
const restoreOpen = ref(false)
const changeSummary = ref('')
const publishRequestError = ref<string | null>(null)
const historyError = ref<string | null>(null)
const selectedVersionNumber = ref<number | null>(null)

const permissions = computed(() => projectState.project?.id === props.projectId
  ? projectState.project.permissions
  : [])
const canPublish = computed(() => props.document.publicationState === 'draft'
  && permissions.value.includes(PROJECT_PERMISSION.DOCUMENTS_PUBLISH))
const canViewHistory = computed(() => permissions.value.includes(PROJECT_PERMISSION.DOCUMENTS_VIEW_HISTORY))
const canRestore = computed(() => canViewHistory.value
  && permissions.value.includes(PROJECT_PERMISSION.DOCUMENTS_UPDATE_DRAFT))
const documentActionId = computed(() => `${props.projectId}:${props.document.id}`)
const publishing = computed(() => actions.isPendingFor(DOCUMENT_ACTION.PUBLISH, documentActionId.value))
const loadingHistory = computed(() => actions.isPendingFor(DOCUMENT_ACTION.LOAD_VERSIONS, documentActionId.value))
const restoring = computed(() => actions.isPendingFor(DOCUMENT_ACTION.RESTORE_VERSION, documentActionId.value))
const loadingVersion = computed(() => selectedVersionNumber.value !== null
  && actions.isPendingFor(
    DOCUMENT_ACTION.LOAD_VERSION,
    `${props.projectId}:${props.document.id}:${selectedVersionNumber.value}`,
  ))

function mutationError(code: string): string {
  return code === DOCUMENT_DRAFT_UPDATE_CODE.DRAFT_CONFLICT
    ? 'Страница изменилась в другой вкладке. Обновите её и повторите действие.'
    : 'Не удалось выполнить действие. Попробуйте ещё раз.'
}

async function refreshDocument(): Promise<void> {
  const document = await actions.loadDocument(props.projectId, props.document.id)
  if (document) {
    state.applyCurrent(document)
  }
}

function setPublishOpen(open: boolean): void {
  publishOpen.value = open
  if (!open) {
    publishRequestError.value = null
    changeSummary.value = ''
  }
}

function updateChangeSummary(value: string | number): void {
  changeSummary.value = String(value)
  publishRequestError.value = null
}

async function publishDocument(): Promise<void> {
  const summary = changeSummary.value.trim()
  publishRequestError.value = null
  const result = await actions.publish(props.projectId, props.document.id, {
    changeSummary: summary,
    expectedRevision: props.document.draftRevision,
  })
  if (!result) {
    publishRequestError.value = actions.error.value ?? 'Не удалось опубликовать страницу.'
    return
  }
  if (!result.ok) {
    publishRequestError.value = mutationError(result.code)
    return
  }
  historyLoaded.value = false
  state.clearVersions()
  setPublishOpen(false)
  await refreshDocument()
}

async function loadVersions(): Promise<void> {
  historyError.value = null
  const versions = await actions.loadVersions(props.projectId, props.document.id)
  if (!versions) {
    historyError.value = actions.error.value ?? 'Не удалось загрузить историю версий.'
    return
  }
  state.applyVersions(versions)
  historyLoaded.value = true
}

function openHistory(): void {
  if (historyLoaded.value || loadingHistory.value) {
    return
  }
  void loadVersions()
}

function setVersionPreviewOpen(open: boolean): void {
  versionPreviewOpen.value = open
  if (!open) {
    restoreOpen.value = false
    selectedVersionNumber.value = null
    state.applySelectedVersion(null)
  }
}

async function selectVersion(version: DocumentVersionSummary): Promise<void> {
  historyError.value = null
  selectedVersionNumber.value = version.versionNumber
  state.applySelectedVersion(null)
  versionPreviewOpen.value = true
  const detail = await actions.loadVersion(props.projectId, props.document.id, version.versionNumber)
  if (!detail || selectedVersionNumber.value !== version.versionNumber) {
    if (!detail) {
      historyError.value = actions.error.value ?? 'Не удалось загрузить выбранную версию.'
    }
    return
  }
  state.applySelectedVersion(detail)
}

async function restoreVersion(): Promise<void> {
  const version = state.selectedVersion
  if (!version) {
    return
  }
  historyError.value = null
  const result = await actions.restoreVersion(
    props.projectId,
    props.document.id,
    version.versionNumber,
    { expectedRevision: props.document.draftRevision },
  )
  if (!result) {
    historyError.value = actions.error.value ?? 'Не удалось восстановить версию.'
    return
  }
  if (!result.ok) {
    historyError.value = mutationError(result.code)
    return
  }
  restoreOpen.value = false
  versionPreviewOpen.value = false
  historyLoaded.value = false
  state.clearVersions()
  await refreshDocument()
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <DocumentDetailsPanel
      :project-id="projectId"
      :document="document"
      :can-view-history="canViewHistory"
      :versions="state.versions"
      :loading-history="loadingHistory"
      :history-error="historyError"
      @open-history="openHistory"
      @select-version="selectVersion"
    />
    <UiButton v-if="canPublish" size="sm" @click="setPublishOpen(true)">
      <Rocket data-icon="inline-start" />
      Опубликовать
    </UiButton>

    <UiDialog :open="publishOpen" @update:open="setPublishOpen">
      <UiDialogContent>
        <UiDialogHeader>
          <UiDialogTitle>Опубликовать страницу</UiDialogTitle>
          <UiDialogDescription>
            Будет создана неизменяемая версия текущего сохранённого черновика.
          </UiDialogDescription>
        </UiDialogHeader>
        <UiFieldGroup>
          <UiField>
            <UiFieldLabel for="document-change-summary">Комментарий к версии (необязательно)</UiFieldLabel>
            <UiTextarea
              id="document-change-summary"
              :model-value="changeSummary"
              maxlength="1000"
              placeholder="Кратко опишите изменения"
              @update:model-value="updateChangeSummary"
            />
          </UiField>
        </UiFieldGroup>
        <UiAlert v-if="publishRequestError" variant="destructive" role="alert">
          <UiAlertTitle>Не удалось опубликовать страницу</UiAlertTitle>
          <UiAlertDescription>{{ publishRequestError }}</UiAlertDescription>
        </UiAlert>
        <UiDialogFooter>
          <UiButton variant="outline" :disabled="publishing" @click="setPublishOpen(false)">Отмена</UiButton>
          <UiButton :disabled="publishing" @click="publishDocument">
            <UiSpinner v-if="publishing" data-icon="inline-start" />
            Опубликовать
          </UiButton>
        </UiDialogFooter>
      </UiDialogContent>
    </UiDialog>

    <UiDialog :open="versionPreviewOpen" @update:open="setVersionPreviewOpen">
      <UiDialogContent class="flex max-h-[calc(100vh-2rem)] flex-col sm:max-w-4xl">
        <UiDialogHeader>
          <UiDialogTitle>Предпросмотр версии</UiDialogTitle>
          <UiDialogDescription v-if="state.selectedVersion">
            Версия {{ state.selectedVersion.versionNumber }} · {{ formatDocumentUpdatedAt(state.selectedVersion.publishedAt) }} · {{ state.selectedVersion.publishedByName }}
          </UiDialogDescription>
          <UiDialogDescription v-else>Загрузка опубликованной версии страницы.</UiDialogDescription>
        </UiDialogHeader>

        <UiAlert v-if="historyError" variant="destructive" role="alert">
          <UiAlertTitle>Не удалось открыть версию</UiAlertTitle>
          <UiAlertDescription>{{ historyError }}</UiAlertDescription>
        </UiAlert>
        <div v-else-if="loadingVersion" class="flex min-h-64 items-center justify-center">
          <UiSpinner class="size-6" />
        </div>
        <template v-else-if="state.selectedVersion">
          <UiAlert>
            <UiAlertTitle>Комментарий к версии</UiAlertTitle>
            <UiAlertDescription>{{ state.selectedVersion.changeSummary || 'Без комментария' }}</UiAlertDescription>
          </UiAlert>
          <UiSeparator />
          <UiScrollArea class="min-h-0 flex-1 pr-4">
            <article class="flex flex-col gap-6 pb-4">
              <h2 class="text-2xl font-semibold tracking-tight">{{ state.selectedVersion.title }}</h2>
              <div class="flex flex-col gap-2">
                <DocumentContentNode
                  v-for="(node, index) in state.selectedVersion.content.content"
                  :key="index"
                  :node="node"
                />
              </div>
            </article>
          </UiScrollArea>
          <UiDialogFooter v-if="canRestore">
            <UiButton variant="outline" @click="restoreOpen = true">Восстановить эту версию</UiButton>
          </UiDialogFooter>
        </template>
      </UiDialogContent>
    </UiDialog>

    <UiAlertDialog :open="restoreOpen" @update:open="restoreOpen = $event">
      <UiAlertDialogContent>
        <UiAlertDialogHeader>
          <UiAlertDialogTitle>Восстановить версию?</UiAlertDialogTitle>
          <UiAlertDialogDescription>
            Содержимое и название версии станут новым черновиком. Опубликованная история останется без изменений.
          </UiAlertDialogDescription>
        </UiAlertDialogHeader>
        <UiAlertDialogFooter>
          <UiAlertDialogCancel :disabled="restoring">Отмена</UiAlertDialogCancel>
          <UiButton :disabled="restoring" @click="restoreVersion">
            <UiSpinner v-if="restoring" data-icon="inline-start" />
            Восстановить
          </UiButton>
        </UiAlertDialogFooter>
      </UiAlertDialogContent>
    </UiAlertDialog>
  </div>
</template>
