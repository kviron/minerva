<script setup lang="ts">
import Link from '@tiptap/extension-link'
import { TableKit } from '@tiptap/extension-table'
import StarterKit from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useProjectOverviewStore } from '@/features/projects'
import type { DocumentContent, DocumentDetailResponse, DocumentTreeNode } from '../../../../shared/documents/contracts'
import type { EmbedTheme } from '../../../../shared/embeds/constants'
import { DOCUMENT_DRAFT_UPDATE_CODE } from '../../../../shared/documents/constants'
import { PROJECT_PERMISSION } from '../../../../shared/projects/constants'
import { parseEditorDocumentContent } from '../model/editor-content'
import { DOCUMENT_ACTION } from '../model/actions/actions'
import { useDocumentsActions } from '../model/actions/provider'
import { useDocumentsStore } from '../model/documents-state'
import { toTiptapEditorContent } from '../model/editor-content'
import { createDocumentImageExtension } from '../model/document-image'
import { createDocumentEmbedExtension } from '../model/document-embed'
import DocumentEditorToolbar from './DocumentEditorToolbar.vue'

type EditorStatus = 'loading' | 'saved' | 'dirty' | 'saving' | 'conflict' | 'error'

const props = defineProps<{
  projectId: string
  documentId: string
}>()

const actions = useDocumentsActions()
const state = useDocumentsStore()
const projectState = useProjectOverviewStore()
const colorMode = useColorMode()
const currentDocument = ref<DocumentDetailResponse | null>(null)
const title = ref('')
const revision = ref(0)
const status = ref<EditorStatus>('loading')
const loadError = ref<string | null>(null)
const saveError = ref<string | null>(null)
const initializing = ref(false)
const dirtySequence = ref(0)
const savedSequence = ref(0)
const saveInFlight = ref(false)
const publishDialogOpen = ref(false)
const publicationSummary = ref('')
const publishError = ref<string | null>(null)
let activeSave: Promise<boolean> | null = null
let resolveLeaveDecision: ((allow: boolean) => void) | null = null
const leaveDialogOpen = ref(false)

const canEdit = computed(() => {
  const project = projectState.project
  return project?.id === props.projectId
    && project.permissions.includes(PROJECT_PERMISSION.DOCUMENTS_UPDATE_DRAFT)
})
const loading = computed(() => actions.isPendingFor(DOCUMENT_ACTION.LOAD_DOCUMENT, `${props.projectId}:${props.documentId}`))
const saving = computed(() => saveInFlight.value)
const publishing = computed(() => actions.isPendingFor(DOCUMENT_ACTION.PUBLISH, `${props.projectId}:${props.documentId}`))
const hasUnsavedChanges = computed(() => dirtySequence.value > savedSequence.value)
const canPublish = computed(() => {
  const project = projectState.project
  return project?.id === props.projectId
    && project.permissions.includes(PROJECT_PERMISSION.DOCUMENTS_PUBLISH)
})
const canShare = computed(() => {
  const project = projectState.project
  return project?.id === props.projectId
    && project.permissions.includes(PROJECT_PERMISSION.DOCUMENTS_SHARE)
})
const treeHasPublishedVersion = (nodes: readonly DocumentTreeNode[], documentId: string): boolean => {
  for (const node of nodes) {
    if (node.id === documentId) return node.hasPublishedVersions
    if (treeHasPublishedVersion(node.children, documentId)) return true
  }
  return false
}
const hasPublishedVersion = computed(() => treeHasPublishedVersion(state.tree, props.documentId))
const canSaveAndPublish = computed(() => canPublish.value
  && (currentDocument.value?.publicationState === 'draft' || hasUnsavedChanges.value))
const statusLabel = computed(() => {
  if (status.value === 'saving') {
    return 'Сохранение…'
  }
  if (status.value === 'dirty') {
    return 'Есть несохранённые изменения'
  }
  if (status.value === 'conflict') {
    return 'Конфликт изменений'
  }
  if (status.value === 'error') {
    return 'Не удалось сохранить'
  }
  return `Сохранено · ревизия ${revision.value}`
})
const currentEmbedTheme = (): EmbedTheme => colorMode.value === 'dark' ? 'dark' : 'light'

const editor = useEditor({
  content: { type: 'doc', content: [{ type: 'paragraph' }] },
  extensions: [
    StarterKit.configure({ link: false }),
    Link.configure({ openOnClick: false, autolink: true, defaultProtocol: 'https', protocols: ['document'] }),
    TableKit.configure({ table: { resizable: true, lastColumnResizable: true } }),
    createDocumentImageExtension(props.projectId),
    createDocumentEmbedExtension({
      current: currentEmbedTheme,
      subscribe: listener => watch(
        () => colorMode.value,
        () => listener(currentEmbedTheme()),
      ),
    }),
  ],
  editorProps: {
    attributes: {
      class: 'min-h-[28rem] px-6 py-5 outline-none [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4',
      'aria-label': 'Содержимое документа',
    },
  },
  onUpdate: () => markDirty(),
})

function markDirty(): void {
  if (initializing.value || status.value === 'loading' || status.value === 'conflict' || !canEdit.value) {
    return
  }
  dirtySequence.value += 1
  if (saving.value) {
    return
  }
  status.value = 'dirty'
  saveError.value = null
}

function applyLoadedDocument(document: DocumentDetailResponse): void {
  initializing.value = true
  currentDocument.value = document
  state.applyCurrent(document)
  title.value = document.title
  revision.value = document.draftRevision
  editor.value?.commands.setContent(toTiptapEditorContent(document.draftContent), {
    emitUpdate: false,
    errorOnInvalidContent: true,
  })
  dirtySequence.value = 0
  savedSequence.value = 0
  status.value = 'saved'
  loadError.value = null
  saveError.value = null
  initializing.value = false
}

async function load(): Promise<void> {
  status.value = 'loading'
  loadError.value = null
  const [document, tree] = await Promise.all([
    actions.loadDocument(props.projectId, props.documentId),
    actions.loadTree(props.projectId),
  ])
  if (!document || !tree) {
    loadError.value = actions.error.value
    status.value = 'error'
    return
  }
  state.applyTree(tree)
  applyLoadedDocument(document)
}

async function performSave(): Promise<boolean> {
  const activeEditor = editor.value
  const document = currentDocument.value
  if (!activeEditor || !document || !canEdit.value || status.value === 'conflict') {
    return false
  }
  if (!hasUnsavedChanges.value) {
    return true
  }
  const normalizedTitle = title.value.trim()
  if (normalizedTitle.length === 0 || normalizedTitle.length > 200) {
    saveError.value = 'Название должно содержать от 1 до 200 символов.'
    status.value = 'error'
    return false
  }

  let content: DocumentContent
  try {
    content = parseEditorDocumentContent(activeEditor.getJSON())
  }
  catch {
    saveError.value = 'Содержимое документа имеет неподдерживаемый формат.'
    status.value = 'error'
    return false
  }

  const savingSequence = dirtySequence.value
  saveInFlight.value = true
  status.value = 'saving'
  const result = await actions.updateDraft(props.projectId, props.documentId, {
    title: normalizedTitle,
    content,
    expectedRevision: revision.value,
  })
  saveInFlight.value = false
  if (!result) {
    saveError.value = actions.error.value
    status.value = 'error'
    return false
  }
  if (!result.ok) {
    if (result.code === DOCUMENT_DRAFT_UPDATE_CODE.DRAFT_CONFLICT) {
      status.value = 'conflict'
      saveError.value = null
    }
    return false
  }

  revision.value = result.value.draftRevision
  savedSequence.value = savingSequence
  if (title.value !== normalizedTitle) {
    initializing.value = true
    title.value = normalizedTitle
    initializing.value = false
  }
  const updated: DocumentDetailResponse = {
    ...document,
    title: normalizedTitle,
    draftContent: content,
    draftRevision: result.value.draftRevision,
    publicationState: 'draft',
    updatedAt: result.value.updatedAt,
  }
  currentDocument.value = updated
  state.applyCurrent(updated)
  if (dirtySequence.value > savedSequence.value) {
    status.value = 'dirty'
    return false
  }
  status.value = 'saved'
  return true
}

function confirmUnsavedChanges(): Promise<boolean> {
  if (!hasUnsavedChanges.value) {
    return Promise.resolve(true)
  }
  leaveDialogOpen.value = true
  return new Promise((resolve) => {
    resolveLeaveDecision = resolve
  })
}

function decideRouteLeave(allow: boolean): void {
  leaveDialogOpen.value = false
  const resolve = resolveLeaveDecision
  resolveLeaveDecision = null
  resolve?.(allow)
}

function setLeaveDialogOpen(open: boolean): void {
  leaveDialogOpen.value = open
  if (!open && resolveLeaveDecision !== null) {
    decideRouteLeave(false)
  }
}

function handleBeforeUnload(event: BeforeUnloadEvent): void {
  if (!hasUnsavedChanges.value) {
    return
  }
  event.preventDefault()
  event.returnValue = ''
}

function saveDraft(): Promise<boolean> {
  if (activeSave !== null) {
    return activeSave
  }
  const operation = performSave().finally(() => {
    if (activeSave === operation) {
      activeSave = null
      saveInFlight.value = false
    }
  })
  activeSave = operation
  return operation
}

function setPublishDialogOpen(open: boolean): void {
  publishDialogOpen.value = open
  if (!open) {
    publicationSummary.value = ''
    publishError.value = null
  }
}

async function publishAndView(): Promise<void> {
  publishError.value = null
  const saved = await saveDraft()
  if (!saved || hasUnsavedChanges.value) {
    return
  }
  const result = await actions.publish(props.projectId, props.documentId, {
    changeSummary: publicationSummary.value.trim(),
    expectedRevision: revision.value,
  })
  if (!result) {
    publishError.value = actions.error.value ?? 'Не удалось опубликовать страницу.'
    return
  }
  if (!result.ok) {
    publishError.value = result.code === DOCUMENT_DRAFT_UPDATE_CODE.DRAFT_CONFLICT
      ? 'Страница изменилась в другом окне. Загрузите актуальную версию и повторите действие.'
      : 'Не удалось опубликовать страницу. Попробуйте ещё раз.'
    return
  }
  setPublishDialogOpen(false)
  await navigateTo(`/projects/${props.projectId}/documents/${props.documentId}`)
}

watch(title, () => markDirty(), { flush: 'sync' })
watch(editor, (activeEditor) => {
  const document = currentDocument.value
  if (activeEditor && document) {
    activeEditor.commands.setContent(toTiptapEditorContent(document.draftContent), { emitUpdate: false, errorOnInvalidContent: true })
  }
})
watch(() => [props.projectId, props.documentId], load, { immediate: true })

onBeforeRouteLeave(async () => {
  if (activeSave !== null) {
    await activeSave
  }
  return await confirmUnsavedChanges()
})
onMounted(() => window.addEventListener('beforeunload', handleBeforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', handleBeforeUnload))
</script>

<template>
  <UiAlert v-if="!canEdit" variant="destructive" role="alert">
    <UiAlertTitle>Недостаточно прав для редактирования</UiAlertTitle>
    <UiAlertDescription>Для изменения черновика требуется разрешение documents.update_draft.</UiAlertDescription>
    <UiAlertAction>
      <UiButton as-child variant="outline" size="sm">
        <NuxtLink :to="`/projects/${projectId}/documents/${documentId}`">Открыть страницу</NuxtLink>
      </UiButton>
    </UiAlertAction>
  </UiAlert>

  <div v-else-if="loading || status === 'loading'" class="flex flex-col gap-4">
    <UiSkeleton class="h-9 w-2/3" />
    <UiSkeleton class="h-10 w-full" />
    <UiSkeleton class="h-96 w-full" />
  </div>

  <UiAlert v-else-if="loadError" variant="destructive" role="alert">
    <UiAlertTitle>Не удалось загрузить черновик</UiAlertTitle>
    <UiAlertDescription>{{ loadError }}</UiAlertDescription>
    <UiAlertAction><UiButton variant="outline" size="sm" @click="load">Повторить</UiButton></UiAlertAction>
  </UiAlert>

  <div v-else-if="currentDocument && editor" class="flex min-w-0 flex-col gap-4">
    <UiAlert v-if="status === 'conflict'" variant="destructive" role="alert">
      <UiAlertTitle>Черновик изменён в другом окне</UiAlertTitle>
      <UiAlertDescription>
        Сохранение отклонено, чтобы не перезаписать более новую версию. Загрузите актуальный черновик.
      </UiAlertDescription>
      <UiAlertAction><UiButton variant="outline" size="sm" @click="load">Загрузить актуальную версию</UiButton></UiAlertAction>
    </UiAlert>

    <UiAlert v-else-if="saveError" variant="destructive" role="alert">
      <UiAlertTitle>Не удалось сохранить черновик</UiAlertTitle>
      <UiAlertDescription>{{ saveError }}</UiAlertDescription>
      <UiAlertAction><UiButton variant="outline" size="sm" @click="saveDraft">Повторить</UiButton></UiAlertAction>
    </UiAlert>

    <UiField class="min-w-0">
      <UiFieldLabel for="document-title" class="sr-only">Название страницы</UiFieldLabel>
      <UiInput id="document-title" v-model="title" maxlength="200" class="h-auto border-0 px-0 text-2xl font-semibold shadow-none focus-visible:ring-0" />
    </UiField>

    <div class="rounded-md border bg-background">
      <DocumentEditorToolbar
        :editor="editor"
        :documents="state.tree"
        :current-document-id="documentId"
        :project-id="projectId"
        :status-label="statusLabel"
        :saving="saving"
        :publishing="publishing"
        :can-save="status !== 'conflict' && hasUnsavedChanges"
        :can-publish="canPublish"
        :can-save-and-publish="status !== 'conflict' && canSaveAndPublish"
        :can-share="canShare"
        :has-published-version="hasPublishedVersion"
        :view-href="`/projects/${projectId}/documents/${documentId}`"
        @save="saveDraft"
        @publish="setPublishDialogOpen(true)"
      />
      <EditorContent :editor="editor" />
    </div>

    <UiDialog :open="publishDialogOpen" @update:open="setPublishDialogOpen">
      <UiDialogContent>
        <UiDialogHeader>
          <UiDialogTitle>Сохранить и опубликовать</UiDialogTitle>
          <UiDialogDescription>
            Черновик будет сохранён, опубликован как новая неизменяемая версия, после чего откроется просмотр страницы.
          </UiDialogDescription>
        </UiDialogHeader>
        <UiFieldGroup>
          <UiField>
            <UiFieldLabel for="editor-publication-summary">Комментарий к версии (необязательно)</UiFieldLabel>
            <UiTextarea
              id="editor-publication-summary"
              v-model="publicationSummary"
              maxlength="1000"
              placeholder="Кратко опишите изменения"
            />
          </UiField>
        </UiFieldGroup>
        <UiAlert v-if="publishError" variant="destructive" role="alert">
          <UiAlertTitle>Не удалось опубликовать страницу</UiAlertTitle>
          <UiAlertDescription>{{ publishError }}</UiAlertDescription>
        </UiAlert>
        <UiDialogFooter>
          <UiButton variant="outline" :disabled="saving || publishing" @click="setPublishDialogOpen(false)">
            Отмена
          </UiButton>
          <UiButton :disabled="saving || publishing" @click="publishAndView">
            <UiSpinner v-if="saving || publishing" data-icon="inline-start" />
            Сохранить и опубликовать
          </UiButton>
        </UiDialogFooter>
      </UiDialogContent>
    </UiDialog>

    <UiAlertDialog :open="leaveDialogOpen" @update:open="setLeaveDialogOpen">
      <UiAlertDialogContent>
        <UiAlertDialogHeader>
          <UiAlertDialogTitle>Покинуть редактор?</UiAlertDialogTitle>
          <UiAlertDialogDescription>
            Несохранённые изменения будут потеряны. Ревизия создаётся только после нажатия кнопки «Сохранить».
          </UiAlertDialogDescription>
        </UiAlertDialogHeader>
        <UiAlertDialogFooter>
          <UiAlertDialogCancel @click="decideRouteLeave(false)">Остаться</UiAlertDialogCancel>
          <UiButton variant="destructive" @click="decideRouteLeave(true)">Покинуть без сохранения</UiButton>
        </UiAlertDialogFooter>
      </UiAlertDialogContent>
    </UiAlertDialog>
  </div>
</template>

<style scoped>
:deep(.tiptap) {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

:deep(.tiptap h1) { font-size: 2.25rem; font-weight: 800; line-height: 2.5rem; letter-spacing: -0.025em; text-wrap: balance; }
:deep(.tiptap h2) { border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; font-size: 1.875rem; font-weight: 600; line-height: 2.25rem; letter-spacing: -0.025em; }
:deep(.tiptap h3) { font-size: 1.5rem; font-weight: 600; line-height: 2rem; letter-spacing: -0.025em; }
:deep(.tiptap h4) { font-size: 1.25rem; font-weight: 600; line-height: 1.75rem; letter-spacing: -0.025em; }
:deep(.tiptap ul) { list-style: disc; padding-left: 1.5rem; }
:deep(.tiptap ol) { list-style: decimal; padding-left: 1.5rem; }
:deep(.tiptap blockquote) { border-left: 2px solid var(--border); padding-left: 1rem; color: var(--muted-foreground); }
:deep(.tiptap pre) { overflow-x: auto; border-radius: var(--radius-md); background: var(--muted); padding: 1rem; font-size: 0.875rem; }
:deep(.tiptap .tableWrapper) { margin: 0.25rem 0; overflow-x: auto; }
:deep(.tiptap table) { width: 100%; table-layout: fixed; border-collapse: collapse; }
:deep(.tiptap th),
:deep(.tiptap td) { position: relative; min-width: 4rem; border: 1px solid var(--border); padding: 0.5rem 0.625rem; vertical-align: top; }
:deep(.tiptap th) { background: var(--muted); font-weight: 600; text-align: left; }
:deep(.tiptap th p),
:deep(.tiptap td p) { margin: 0; }
:deep(.tiptap .selectedCell::after) { position: absolute; inset: 0; background: color-mix(in oklab, var(--primary) 12%, transparent); content: ''; pointer-events: none; }
:deep(.tiptap .column-resize-handle) { position: absolute; top: 0; right: -2px; bottom: -2px; width: 4px; background: var(--primary); pointer-events: none; }
:deep(.tiptap.resize-cursor) { cursor: col-resize; }
:deep(.tiptap p.is-editor-empty:first-child::before) { color: var(--muted-foreground); content: 'Начните писать…'; float: left; height: 0; pointer-events: none; }
</style>
