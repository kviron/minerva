<script setup lang="ts">
import type { ProjectListItem } from '../../../../shared/projects/contracts'
import { projectRoleLabel, projectStatusLabel, projectUpdatedAtLabel } from '../model/presentation'

withDefaults(defineProps<{
  projects: readonly ProjectListItem[]
  mode?: 'member' | 'administration'
}>(), { mode: 'member' })

const router = useRouter()
const openProject = (projectId: string) => router.push(`/projects/${projectId}`)
</script>

<template>
  <div class="overflow-hidden rounded-lg border">
    <UiTable>
      <UiTableHeader>
        <UiTableRow>
          <UiTableHead>Проект</UiTableHead>
          <UiTableHead>Описание</UiTableHead>
          <UiTableHead>{{ mode === 'administration' ? 'Участники' : 'Ваша роль' }}</UiTableHead>
          <UiTableHead>Статус</UiTableHead>
          <UiTableHead>Обновлён</UiTableHead>
        </UiTableRow>
      </UiTableHeader>
      <UiTableBody>
        <UiTableRow
          v-for="project in projects"
          :key="project.id"
          class="cursor-pointer hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          role="link"
          tabindex="0"
          :aria-label="`Открыть проект ${project.name}`"
          @click="openProject(project.id)"
          @keydown.enter.prevent="openProject(project.id)"
          @keydown.space.prevent="openProject(project.id)"
        >
          <UiTableCell class="font-medium">
            {{ project.name }}
          </UiTableCell>
          <UiTableCell class="max-w-80 truncate text-muted-foreground">
            {{ project.description || '—' }}
          </UiTableCell>
          <UiTableCell>
            {{ mode === 'administration' && 'activeMemberCount' in project
              ? project.activeMemberCount
              : 'role' in project ? projectRoleLabel(project.role) : '—' }}
          </UiTableCell>
          <UiTableCell>{{ projectStatusLabel(project.status) }}</UiTableCell>
          <UiTableCell>{{ projectUpdatedAtLabel(project.updatedAt) }}</UiTableCell>
        </UiTableRow>
      </UiTableBody>
    </UiTable>
  </div>
</template>
