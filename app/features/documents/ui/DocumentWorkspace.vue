<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { DOCUMENT_ACTION } from '../model/actions/actions'
import { useDocumentsActions } from '../model/actions/provider'
import { useDocumentsStore } from '../model/documents-state'
import DocumentTree from './DocumentTree.vue'
import DocumentViewer from './DocumentViewer.vue'

const props = defineProps<{
  projectId: string
  documentId: string
}>()

const actions = useDocumentsActions()
const state = useDocumentsStore()
const loadError = ref<string | null>(null)
const pending = computed(() =>
  actions.isPendingFor(DOCUMENT_ACTION.LOAD_TREE, props.projectId)
  || actions.isPendingFor(DOCUMENT_ACTION.LOAD_DOCUMENT, `${props.projectId}:${props.documentId}`))

const load = async () => {
  state.clearReader()
  loadError.value = null
  const [tree, document] = await Promise.all([
    actions.loadTree(props.projectId),
    actions.loadDocument(props.projectId, props.documentId),
  ])
  if (tree && document) {
    state.applyTree(tree)
    state.applyCurrent(document)
    return
  }
  loadError.value = actions.error.value
}

watch(() => [props.projectId, props.documentId], load, { immediate: true })
</script>

<template>
  <div v-if="pending" class="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
    <UiSkeleton class="h-72 w-full" />
    <div class="flex flex-col gap-4">
      <UiSkeleton class="h-9 w-2/3" />
      <UiSkeleton class="h-4 w-48" />
      <UiSkeleton class="h-48 w-full" />
    </div>
  </div>

  <UiAlert v-else-if="loadError || !state.current" variant="destructive" role="alert">
    <UiAlertTitle>Не удалось открыть страницу</UiAlertTitle>
    <UiAlertDescription>{{ loadError ?? 'Страница недоступна.' }}</UiAlertDescription>
    <UiAlertAction>
      <UiButton variant="outline" size="sm" @click="load">Повторить</UiButton>
    </UiAlertAction>
  </UiAlert>

  <div v-else class="grid min-w-0 gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
    <DocumentTree
      :project-id="projectId"
      :nodes="state.tree"
      :active-document-id="documentId"
    />
    <DocumentViewer :project-id="projectId" :document="state.current" />
  </div>
</template>
