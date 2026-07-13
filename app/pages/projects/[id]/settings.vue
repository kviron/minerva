<script setup lang="ts">
import { computed } from 'vue'
import { ProjectSectionPlaceholder, ProjectShell } from '@/features/projects'

const route = useRoute()
const projectId = computed(() => String(route.params.id))
</script>

<template>
  <ProjectShell :project-id="projectId" active="settings">
    <template #default>
      <ProjectSectionPlaceholder
        title="Настройки проекта"
        description="Общие настройки, участники, роли и аудит будут добавлены отдельными защищёнными разделами."
      />
    </template>
  </ProjectShell>
</template>
