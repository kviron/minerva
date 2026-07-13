<script setup lang="ts">
import { Plus } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { useProjects } from '../model/use-projects'
import { filterProjectsByStatus, PROJECT_STATUS_FILTER } from '../model/project-status-filter'
import CreateProjectDialog from './CreateProjectDialog.vue'
import ProjectsEmpty from './ProjectsEmpty.vue'
import ProjectsFilterEmpty from './ProjectsFilterEmpty.vue'
import ProjectsLoadError from './ProjectsLoadError.vue'
import ProjectStatusTabs from './ProjectStatusTabs.vue'
import ProjectsTable from './ProjectsTable.vue'
import ProjectsTableSkeleton from './ProjectsTableSkeleton.vue'
import type { ProjectsScope } from '../model/use-projects'

const props = withDefaults(defineProps<{ scope?: ProjectsScope }>(), { scope: 'member' })

const { projects, pending, error, load, create } = useProjects(props.scope)
const dialogOpen = ref(false)
const createError = ref('')
const creating = ref(false)
const statusFilter = ref(PROJECT_STATUS_FILTER.ALL)
const filteredProjects = computed(() => filterProjectsByStatus(projects.value, statusFilter.value))

onMounted(load)

const createProject = async (input: { name: string, description: string | null }) => {
  createError.value = ''
  creating.value = true
  try {
    await create(input)
    dialogOpen.value = false
  }
  catch {
    createError.value = 'Не удалось создать проект.'
  }
  finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 px-4 lg:px-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex flex-col gap-1">
        <h1 class="text-2xl font-semibold">Проекты</h1>
        <p class="text-sm text-muted-foreground">
          {{ scope === 'administration'
            ? 'Все проекты приложения и количество активных участников.'
            : 'Доступные вам рабочие пространства и документация.' }}
        </p>
      </div>
      <UiButton @click="dialogOpen = true">
        <Plus data-icon="inline-start" />
        Создать проект
      </UiButton>
    </div>

    <ProjectStatusTabs
      v-model="statusFilter"
      :disabled="pending || Boolean(error) || projects.length === 0"
    />

    <ProjectsTableSkeleton v-if="pending" />
    <ProjectsLoadError v-else-if="error" :message="error" @retry="load" />
    <ProjectsEmpty v-else-if="projects.length === 0" @create="dialogOpen = true" />
    <ProjectsFilterEmpty v-else-if="filteredProjects.length === 0" />
    <ProjectsTable
      v-else
      :projects="filteredProjects"
      :mode="scope === 'administration' ? 'administration' : 'member'"
    />

    <CreateProjectDialog
      v-model:open="dialogOpen"
      :pending="creating"
      :submit-error="createError"
      @create="createProject"
    />
  </div>
</template>
