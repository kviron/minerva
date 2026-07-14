<script setup lang="ts">
import { ArchiveRestore, FileArchive } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useProjectOverviewStore } from '@/features/projects'
import type { ArchivedDocumentBatch } from '../../../../shared/documents/contracts'
import { PROJECT_PERMISSION } from '../../../../shared/projects/constants'
import { DOCUMENT_ACTION } from '../model/actions/actions'
import { useDocumentsActions } from '../model/actions/provider'
import { useDocumentsStore } from '../model/documents-state'
import { formatDocumentUpdatedAt } from '../model/presentation'

const props = defineProps<{ projectId: string }>()
const actions = useDocumentsActions()
const state = useDocumentsStore()
const projectState = useProjectOverviewStore()
const loadError = ref<string | null>(null)
const restoreError = ref<string | null>(null)
const selected = ref<ArchivedDocumentBatch | null>(null)
const restoreOpen = ref(false)
const loading = computed(() => actions.isPendingFor(DOCUMENT_ACTION.LOAD_ARCHIVE, props.projectId))
const restoring = computed(() => selected.value !== null
  && actions.isPendingFor(DOCUMENT_ACTION.RESTORE, `${props.projectId}:${selected.value.id}`))
const canRestore = computed(() => projectState.project?.id === props.projectId
  && projectState.project.permissions.includes(PROJECT_PERMISSION.DOCUMENTS_RESTORE))

const load = async (): Promise<void> => {
  state.clearArchive()
  loadError.value = null
  const archive = await actions.loadArchive(props.projectId)
  if (archive) state.applyArchive(archive)
  else loadError.value = actions.error.value
}

const openRestore = (batch: ArchivedDocumentBatch): void => {
  selected.value = batch
  restoreError.value = null
  restoreOpen.value = true
  actions.clearError()
}

const setRestoreOpen = (open: boolean): void => {
  restoreOpen.value = open
  if (!open) {
    selected.value = null
    restoreError.value = null
  }
  actions.clearError()
}

const restoreBranch = async (): Promise<void> => {
  if (!selected.value) return
  restoreError.value = null
  const result = await actions.restore(props.projectId, selected.value.id)
  if (!result) {
    restoreError.value = actions.error.value
    return
  }
  state.applyArchive(result.archive)
  state.applyRoots(result.roots)
  setRestoreOpen(false)
}

watch(() => props.projectId, load, { immediate: true })
</script>

<template>
  <section class="flex flex-col gap-4" aria-labelledby="documents-archive-heading">
    <div class="flex flex-col gap-1">
      <h3 id="documents-archive-heading" class="text-lg font-semibold">Архив документации</h3>
      <p class="text-sm text-muted-foreground">Архивированные ветки скрыты из дерева, но сохраняют содержимое и историю версий.</p>
    </div>

    <div v-if="loading" class="flex flex-col gap-3">
      <UiSkeleton v-for="index in 3" :key="index" class="h-24 w-full" />
    </div>
    <UiAlert v-else-if="loadError" variant="destructive" role="alert">
      <UiAlertTitle>Не удалось загрузить архив</UiAlertTitle>
      <UiAlertDescription>{{ loadError }}</UiAlertDescription>
      <UiAlertAction><UiButton variant="outline" size="sm" @click="load">Повторить</UiButton></UiAlertAction>
    </UiAlert>
    <UiEmpty v-else-if="state.archive.length === 0" class="border border-dashed">
      <UiEmptyHeader>
        <UiEmptyMedia variant="icon"><FileArchive /></UiEmptyMedia>
        <UiEmptyTitle>Архив пуст</UiEmptyTitle>
        <UiEmptyDescription>Архивированные ветки документации появятся здесь.</UiEmptyDescription>
      </UiEmptyHeader>
    </UiEmpty>
    <ul v-else class="flex flex-col gap-3">
      <li v-for="batch in state.archive" :key="batch.id">
        <UiCard>
          <UiCardHeader class="flex-row items-start justify-between gap-4">
            <div class="flex min-w-0 flex-col gap-1">
              <UiCardTitle class="truncate text-base">{{ batch.title }}</UiCardTitle>
              <UiCardDescription>
                {{ batch.pageCount }} {{ batch.pageCount === 1 ? 'страница' : 'страниц' }} ·
                архивировано {{ formatDocumentUpdatedAt(batch.archivedAt) }} · {{ batch.archivedByName }}
              </UiCardDescription>
            </div>
            <UiButton v-if="canRestore" variant="outline" size="sm" @click="openRestore(batch)">
              <ArchiveRestore data-icon="inline-start" />
              Восстановить
            </UiButton>
          </UiCardHeader>
        </UiCard>
      </li>
    </ul>

    <UiAlertDialog :open="restoreOpen" @update:open="setRestoreOpen">
      <UiAlertDialogContent>
        <UiAlertDialogHeader>
          <UiAlertDialogTitle>Восстановить ветку?</UiAlertDialogTitle>
          <UiAlertDialogDescription v-if="selected">
            В дерево вернётся страница «{{ selected.title }}» и вся её структура — всего {{ selected.pageCount }} страниц.
          </UiAlertDialogDescription>
        </UiAlertDialogHeader>
        <UiAlert v-if="restoreError" variant="destructive" role="alert">
          <UiAlertTitle>Не удалось восстановить ветку</UiAlertTitle>
          <UiAlertDescription>{{ restoreError }}</UiAlertDescription>
        </UiAlert>
        <UiAlertDialogFooter>
          <UiAlertDialogCancel :disabled="restoring">Отмена</UiAlertDialogCancel>
          <UiButton :disabled="restoring" @click="restoreBranch">
            <UiSpinner v-if="restoring" data-icon="inline-start" />
            Восстановить
          </UiButton>
        </UiAlertDialogFooter>
      </UiAlertDialogContent>
    </UiAlertDialog>
  </section>
</template>
