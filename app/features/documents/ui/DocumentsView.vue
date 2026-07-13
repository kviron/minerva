<script setup lang="ts">
import { Files, Plus } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useProjectOverviewStore } from '@/features/projects'
import type { CreateDocumentRequest } from '../../../../shared/documents/contracts'
import { PROJECT_PERMISSION } from '../../../../shared/projects/constants'
import { DOCUMENT_ACTION } from '../model/actions/actions'
import { useDocumentsActions } from '../model/actions/provider'
import { useDocumentsStore } from '../model/documents-state'
import CreateDocumentDialog from './CreateDocumentDialog.vue'
import DocumentRootList from './DocumentRootList.vue'

const props = defineProps<{ projectId: string }>()
const actions = useDocumentsActions()
const state = useDocumentsStore()
const projectState = useProjectOverviewStore()
const createOpen = ref(false)
const loadError = ref<string | null>(null)
const pending = computed(() => actions.isPendingFor(DOCUMENT_ACTION.LOAD_ROOTS, props.projectId))
const creating = computed(() => actions.isPendingFor(DOCUMENT_ACTION.CREATE, props.projectId))
const createError = computed(() => actions.error.value)
const canCreate = computed(() => {
  const project = projectState.project
  return project?.id === props.projectId
    && project.permissions.includes(PROJECT_PERMISSION.DOCUMENTS_CREATE)
})

const load = async () => {
  state.clearRoots()
  loadError.value = null
  const roots = await actions.loadRoots(props.projectId)
  if (roots) {
    state.applyRoots(roots)
  }
  else {
    loadError.value = actions.error.value
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
    createOpen.value = false
  }
}

watch(() => props.projectId, load, { immediate: true })
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
      <UiButton v-if="canCreate" @click="setCreateOpen(true)">
        <Plus data-icon="inline-start" />
        Создать страницу
      </UiButton>
    </div>

    <UiCard v-if="pending">
      <UiCardHeader>
        <UiSkeleton class="h-5 w-48" />
        <UiSkeleton class="h-4 w-80 max-w-full" />
      </UiCardHeader>
      <UiCardContent class="flex flex-col gap-3">
        <UiSkeleton v-for="index in 3" :key="index" class="h-14 w-full" />
      </UiCardContent>
    </UiCard>

    <UiAlert v-else-if="loadError" variant="destructive" role="alert">
      <UiAlertTitle>Не удалось загрузить документацию</UiAlertTitle>
      <UiAlertDescription>{{ loadError }}</UiAlertDescription>
      <UiAlertAction>
        <UiButton variant="outline" size="sm" @click="load">Повторить</UiButton>
      </UiAlertAction>
    </UiAlert>

    <UiEmpty v-else-if="state.roots.length === 0" class="border border-dashed">
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

    <DocumentRootList v-else :project-id="projectId" :documents="state.roots" />

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
