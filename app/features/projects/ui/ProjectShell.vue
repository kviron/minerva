<script setup lang="ts">
import { computed, watch } from 'vue'
import { PROJECT_ACTION } from '../model/actions/actions'
import { useProjectsActions } from '../model/actions/provider'
import { useProjectOverviewStore } from '../model/project-overview-state'
import type { ProjectSection } from '../model/project-sections'

const props = defineProps<{
  projectId: string
  active: ProjectSection
}>()

const actions = useProjectsActions()
const state = useProjectOverviewStore()
const project = computed(() => state.project)
const pending = computed(() => actions.isPendingFor(PROJECT_ACTION.LOAD_OVERVIEW, props.projectId))
const error = computed(() => actions.error.value)

const load = async () => {
  state.clearProject()
  const project = await actions.loadOverview(props.projectId)
  if (project) {
    state.applyProject(project)
  }
}

watch(() => props.projectId, load, { immediate: true })
</script>

<template>
  <div class="flex flex-col gap-4 px-4 lg:px-6">
    <UiSkeleton v-if="pending" class="h-48 w-full" />

    <UiEmpty v-else-if="error" class="border border-dashed" role="alert">
      <UiEmptyHeader>
        <UiEmptyTitle>Проект недоступен</UiEmptyTitle>
        <UiEmptyDescription>{{ error }}</UiEmptyDescription>
      </UiEmptyHeader>
      <UiEmptyContent>
        <UiButton variant="outline" size="sm" @click="load">Обновить</UiButton>
      </UiEmptyContent>
    </UiEmpty>

    <template v-else-if="project">
      <slot :project="project" />
    </template>
  </div>
</template>
