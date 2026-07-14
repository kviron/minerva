<script setup lang="ts">
import { computed, ref } from 'vue'
import type {
  CreateDocumentRequest,
  DocumentRelationItem,
  DocumentTreeNode,
} from '../../../../shared/documents/contracts'
import type { MoveDocumentRequest } from '../../../../shared/documents/contracts'
import { DOCUMENT_ACTION } from '../model/actions/actions'
import { useDocumentsActions } from '../model/actions/provider'
import { useDocumentsStore } from '../model/documents-state'
import CreateDocumentDialog from './CreateDocumentDialog.vue'
import DocumentTreeBranch from './DocumentTreeBranch.vue'
import MoveDocumentDialog from './MoveDocumentDialog.vue'

const props = defineProps<{
  projectId: string
  nodes: readonly DocumentTreeNode[]
  activeDocumentId: string
}>()

const actions = useDocumentsActions()
const state = useDocumentsStore()
const selectedParent = ref<DocumentRelationItem | null>(null)
const createOpen = ref(false)
const selectedDocument = ref<DocumentTreeNode | null>(null)
const moveOpen = ref(false)
const moveError = ref<string | null>(null)
const selectedArchive = ref<DocumentTreeNode | null>(null)
const archiveOpen = ref(false)
const archiveError = ref<string | null>(null)
const selectedDiscard = ref<DocumentTreeNode | null>(null)
const discardOpen = ref(false)
const discardError = ref<string | null>(null)
const creating = computed(() => actions.isPendingFor(DOCUMENT_ACTION.CREATE, props.projectId))
const moving = computed(() => selectedDocument.value !== null
  && actions.isPendingFor(DOCUMENT_ACTION.MOVE, `${props.projectId}:${selectedDocument.value.id}`))
const archiving = computed(() => selectedArchive.value !== null
  && actions.isPendingFor(DOCUMENT_ACTION.ARCHIVE, `${props.projectId}:${selectedArchive.value.id}`))
const discarding = computed(() => selectedDiscard.value !== null
  && actions.isPendingFor(DOCUMENT_ACTION.DISCARD, `${props.projectId}:${selectedDiscard.value.id}`))
const archivePageCount = computed(() => {
  const count = (node: DocumentTreeNode): number => 1 + node.children.reduce((sum, child) => sum + count(child), 0)
  return selectedArchive.value ? count(selectedArchive.value) : 0
})

const openCreate = (node: DocumentTreeNode): void => {
  selectedParent.value = { id: node.id, title: node.title }
  createOpen.value = true
  actions.clearError()
}

const setCreateOpen = (open: boolean): void => {
  createOpen.value = open
  if (!open) {
    selectedParent.value = null
  }
  actions.clearError()
}

const createDocument = async (input: CreateDocumentRequest): Promise<void> => {
  const selected = selectedParent.value
  if (!selected) {
    return
  }
  const result = await actions.create(props.projectId, { ...input, parentId: selected.id })
  if (!result) {
    return
  }
  state.applyRoots(result.roots)
  setCreateOpen(false)
  await navigateTo(`/projects/${props.projectId}/documents/${result.documentId}`)
}

const openMove = (node: DocumentTreeNode): void => {
  selectedDocument.value = node
  moveError.value = null
  moveOpen.value = true
  actions.clearError()
}

const setMoveOpen = (open: boolean): void => {
  moveOpen.value = open
  if (!open) {
    selectedDocument.value = null
    moveError.value = null
  }
  actions.clearError()
}

const moveDocument = async (input: MoveDocumentRequest): Promise<void> => {
  const selected = selectedDocument.value
  if (!selected) {
    return
  }
  moveError.value = null
  const result = await actions.move(props.projectId, selected.id, input, props.activeDocumentId)
  if (!result) {
    moveError.value = actions.error.value
    return
  }
  state.applyTree(result.tree)
  state.applyCurrent(result.document)
  setMoveOpen(false)
}

const containsDocument = (node: DocumentTreeNode, documentId: string): boolean =>
  node.id === documentId || node.children.some(child => containsDocument(child, documentId))

const openArchive = (node: DocumentTreeNode): void => {
  selectedArchive.value = node
  archiveError.value = null
  archiveOpen.value = true
  actions.clearError()
}

const setArchiveOpen = (open: boolean): void => {
  archiveOpen.value = open
  if (!open) {
    selectedArchive.value = null
    archiveError.value = null
  }
  actions.clearError()
}

const archiveDocument = async (): Promise<void> => {
  const selected = selectedArchive.value
  if (!selected) return
  archiveError.value = null
  const archivesActiveBranch = containsDocument(selected, props.activeDocumentId)
  const tree = await actions.archive(props.projectId, selected.id)
  if (!tree) {
    archiveError.value = actions.error.value
    return
  }
  state.applyTree(tree)
  setArchiveOpen(false)
  if (archivesActiveBranch) {
    await navigateTo(`/projects/${props.projectId}/documents`)
  }
}

const openDiscard = (node: DocumentTreeNode): void => {
  selectedDiscard.value = node
  discardError.value = null
  discardOpen.value = true
  actions.clearError()
}

const setDiscardOpen = (open: boolean): void => {
  discardOpen.value = open
  if (!open) {
    selectedDiscard.value = null
    discardError.value = null
  }
  actions.clearError()
}

const discardDocument = async (): Promise<void> => {
  const selected = selectedDiscard.value
  if (!selected) return
  discardError.value = null
  const discardsActiveBranch = containsDocument(selected, props.activeDocumentId)
  const tree = await actions.discard(props.projectId, selected.id)
  if (!tree) {
    discardError.value = actions.error.value
    return
  }
  state.applyTree(tree)
  setDiscardOpen(false)
  if (discardsActiveBranch) {
    await navigateTo(`/projects/${props.projectId}/documents`)
  }
}
</script>

<template>
  <nav class="min-w-0 border-b pb-4 lg:border-r lg:border-b-0 lg:pr-4" aria-label="Дерево документации">
    <div class="mb-2 text-sm font-medium">Страницы</div>
    <UiScrollArea class="h-56 lg:h-[calc(100vh-11rem)]">
      <ul class="flex flex-col gap-0.5 pr-3">
        <DocumentTreeBranch
          v-for="node in nodes"
          :key="node.id"
          :project-id="projectId"
          :node="node"
          :active-document-id="activeDocumentId"
          @create="openCreate"
          @move="openMove"
          @archive="openArchive"
          @discard="openDiscard"
        />
      </ul>
    </UiScrollArea>

    <CreateDocumentDialog
      :open="createOpen"
      :roots="[]"
      :fixed-parent="selectedParent ?? undefined"
      :pending="creating"
      :submit-error="createOpen ? actions.error.value ?? undefined : undefined"
      @update:open="setCreateOpen"
      @create="createDocument"
    />

    <MoveDocumentDialog
      :open="moveOpen"
      :document="selectedDocument"
      :tree="nodes"
      :pending="moving"
      :submit-error="moveError ?? undefined"
      @update:open="setMoveOpen"
      @move="moveDocument"
    />

    <UiAlertDialog :open="archiveOpen" @update:open="setArchiveOpen">
      <UiAlertDialogContent>
        <UiAlertDialogHeader>
          <UiAlertDialogTitle>Архивировать ветку?</UiAlertDialogTitle>
          <UiAlertDialogDescription v-if="selectedArchive">
            Страница «{{ selectedArchive.title }}» и все вложенные страницы будут скрыты из дерева.
            Всего страниц: {{ archivePageCount }}. Ветку можно будет восстановить из архива.
          </UiAlertDialogDescription>
        </UiAlertDialogHeader>
        <UiAlert v-if="archiveError" variant="destructive" role="alert">
          <UiAlertTitle>Не удалось архивировать ветку</UiAlertTitle>
          <UiAlertDescription>{{ archiveError }}</UiAlertDescription>
        </UiAlert>
        <UiAlertDialogFooter>
          <UiAlertDialogCancel :disabled="archiving">Отмена</UiAlertDialogCancel>
          <UiButton variant="destructive" :disabled="archiving" @click="archiveDocument">
            <UiSpinner v-if="archiving" data-icon="inline-start" />
            В архив
          </UiButton>
        </UiAlertDialogFooter>
      </UiAlertDialogContent>
    </UiAlertDialog>

    <UiAlertDialog :open="discardOpen" @update:open="setDiscardOpen">
      <UiAlertDialogContent>
        <UiAlertDialogHeader>
          <UiAlertDialogTitle>Удалить ветку без возможности восстановления?</UiAlertDialogTitle>
          <UiAlertDialogDescription v-if="selectedDiscard">
            Страница «{{ selectedDiscard.title }}» и все вложенные неопубликованные страницы будут удалены навсегда.
            Вернуть их из архива будет невозможно.
          </UiAlertDialogDescription>
        </UiAlertDialogHeader>
        <UiAlert v-if="discardError" variant="destructive" role="alert">
          <UiAlertTitle>Не удалось удалить ветку</UiAlertTitle>
          <UiAlertDescription>{{ discardError }}</UiAlertDescription>
        </UiAlert>
        <UiAlertDialogFooter>
          <UiAlertDialogCancel :disabled="discarding">Отмена</UiAlertDialogCancel>
          <UiButton variant="destructive" :disabled="discarding" @click="discardDocument">
            <UiSpinner v-if="discarding" data-icon="inline-start" />
            Удалить
          </UiButton>
        </UiAlertDialogFooter>
      </UiAlertDialogContent>
    </UiAlertDialog>
  </nav>
</template>
