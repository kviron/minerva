<script setup lang="ts">
import { Files, Plus, Search } from '@lucide/vue'
import { watchDebounced } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { useProjectOverviewStore } from '@/features/projects'
import type { CreateDocumentRequest } from '../../../../shared/documents/contracts'
import { PROJECT_PERMISSION } from '../../../../shared/projects/constants'
import { DOCUMENT_ACTION } from '../model/actions/actions'
import { useDocumentsActions } from '../model/actions/provider'
import { useDocumentsStore } from '../model/documents-state'
import CreateDocumentDialog from './CreateDocumentDialog.vue'
import DocumentsArchive from './DocumentsArchive.vue'
import DocumentOutlineTree from './DocumentOutlineTree.vue'
import DocumentSearchResults from './DocumentSearchResults.vue'

const props = defineProps<{ projectId: string }>()
const actions = useDocumentsActions()
const state = useDocumentsStore()
const projectState = useProjectOverviewStore()
const createOpen = ref(false)
const activeTab = ref('pages')
const loadError = ref<string | null>(null)
const searchQuery = ref('')
const searchError = ref<string | null>(null)
const normalizedSearchQuery = computed(() => searchQuery.value.trim())
const pending = computed(() => actions.isPendingFor(DOCUMENT_ACTION.LOAD_ROOTS, props.projectId)
  || actions.isPendingFor(DOCUMENT_ACTION.LOAD_TREE, props.projectId))
const searching = computed(() => actions.isPendingFor(DOCUMENT_ACTION.SEARCH, props.projectId))
const creating = computed(() => actions.isPendingFor(DOCUMENT_ACTION.CREATE, props.projectId))
const createError = computed(() => actions.error.value)
const canCreate = computed(() => {
  const project = projectState.project
  return project?.id === props.projectId
    && project.permissions.includes(PROJECT_PERMISSION.DOCUMENTS_CREATE)
})
const canViewArchive = computed(() => {
  const project = projectState.project
  return project?.id === props.projectId
    && (project.permissions.includes(PROJECT_PERMISSION.DOCUMENTS_ARCHIVE)
      || project.permissions.includes(PROJECT_PERMISSION.DOCUMENTS_RESTORE))
})

const load = async () => {
  state.clearRoots()
  state.clearSearchResults()
  searchQuery.value = ''
  searchError.value = null
  loadError.value = null
  const [roots, tree] = await Promise.all([
    actions.loadRoots(props.projectId),
    actions.loadTree(props.projectId),
  ])
  if (roots && tree) {
    state.applyRoots(roots)
    state.applyTree(tree)
  }
  else {
    loadError.value = actions.error.value
  }
}

const searchDocuments = async () => {
  searchError.value = null
  const projectId = props.projectId
  const query = normalizedSearchQuery.value
  if (!query) {
    state.clearSearchResults()
    return
  }
  const results = await actions.search(projectId, query)
  if (projectId !== props.projectId || query !== normalizedSearchQuery.value) return
  if (results) {
    state.applySearchResults(results)
  }
  else {
    searchError.value = actions.error.value
  }
}

const setCreateOpen = (open: boolean) => {
  createOpen.value = open
  actions.clearError()
}

const createDocument = async (input: CreateDocumentRequest) => {
  const result = await actions.create(props.projectId, input)
  if (result) {
    state.applyRoots(result.roots)
    const tree = await actions.loadTree(props.projectId)
    if (tree) state.applyTree(tree)
    createOpen.value = false
  }
}

watch(() => props.projectId, load, { immediate: true })
watchDebounced(searchQuery, searchDocuments, { debounce: 350, maxWait: 800 })
</script>

<template>
  <section class="flex flex-col gap-4" aria-labelledby="documents-heading">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex flex-col gap-1">
        <h2 id="documents-heading" class="text-xl font-semibold">Документация</h2>
        <p class="text-sm text-muted-foreground">
          Корневые страницы — основные разделы документации проекта. Каждый раздел может содержать собственную страницу и вложенные документы.
        </p>
      </div>
      <UiButton v-if="canCreate && activeTab === 'pages'" @click="setCreateOpen(true)">
        <Plus data-icon="inline-start" />
        Создать страницу
      </UiButton>
    </div>

    <UiTabs v-model="activeTab" class="flex flex-col gap-4">
      <UiTabsList>
        <UiTabsTrigger value="pages">Страницы</UiTabsTrigger>
        <UiTabsTrigger v-if="canViewArchive" value="archive">Архив</UiTabsTrigger>
      </UiTabsList>

      <UiTabsContent value="pages" class="flex flex-col gap-4">
    <UiField class="max-w-xl">
      <UiFieldLabel for="documents-search" class="sr-only">Поиск по документации</UiFieldLabel>
      <UiInputGroup>
        <UiInputGroupAddon><Search /></UiInputGroupAddon>
        <UiInputGroupInput
          id="documents-search"
          v-model="searchQuery"
          type="search"
          autocomplete="off"
          placeholder="Поиск по названию и содержимому"
        />
      </UiInputGroup>
    </UiField>

    <UiAlert v-if="searchError" variant="destructive" role="alert">
      <UiAlertTitle>Не удалось выполнить поиск</UiAlertTitle>
      <UiAlertDescription>{{ searchError }}</UiAlertDescription>
    </UiAlert>

    <div v-else-if="searching" class="flex flex-col gap-2">
      <UiSkeleton v-for="index in 3" :key="index" class="h-24 w-full" />
    </div>

    <DocumentSearchResults
      v-else-if="normalizedSearchQuery"
      :project-id="projectId"
      :results="state.searchResults"
    />

    <UiCard v-if="pending">
      <UiCardHeader>
        <UiSkeleton class="h-5 w-48" />
        <UiSkeleton class="h-4 w-80 max-w-full" />
      </UiCardHeader>
      <UiCardContent class="flex flex-col gap-3">
        <UiSkeleton v-for="index in 3" :key="index" class="h-14 w-full" />
      </UiCardContent>
    </UiCard>

    <UiAlert v-else-if="!normalizedSearchQuery && loadError" variant="destructive" role="alert">
      <UiAlertTitle>Не удалось загрузить документацию</UiAlertTitle>
      <UiAlertDescription>{{ loadError }}</UiAlertDescription>
      <UiAlertAction>
        <UiButton variant="outline" size="sm" @click="load">Повторить</UiButton>
      </UiAlertAction>
    </UiAlert>

    <UiEmpty v-else-if="!normalizedSearchQuery && state.tree.length === 0" class="border border-dashed">
      <UiEmptyHeader>
        <UiEmptyMedia variant="icon"><Files /></UiEmptyMedia>
        <UiEmptyTitle>Документация пока пуста</UiEmptyTitle>
        <UiEmptyDescription>
          Здесь появятся корневые страницы — основные разделы документации проекта.
        </UiEmptyDescription>
      </UiEmptyHeader>
      <UiEmptyContent v-if="canCreate">
        <UiButton @click="setCreateOpen(true)">
          <Plus data-icon="inline-start" />
          Создать первую страницу
        </UiButton>
      </UiEmptyContent>
    </UiEmpty>

    <DocumentOutlineTree v-else-if="!normalizedSearchQuery" :project-id="projectId" :nodes="state.tree" />
      </UiTabsContent>

      <UiTabsContent v-if="canViewArchive" value="archive">
        <DocumentsArchive :project-id="projectId" />
      </UiTabsContent>
    </UiTabs>

    <CreateDocumentDialog
      :open="createOpen"
      :roots="state.roots"
      :pending="creating"
      :submit-error="createOpen ? createError ?? undefined : undefined"
      @update:open="setCreateOpen"
      @create="createDocument"
    />
  </section>
</template>
