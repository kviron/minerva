<script setup lang="ts">
import { computed } from 'vue'
import { ProjectSectionPlaceholder, ProjectShell } from '@/features/projects'

const route = useRoute()
const projectId = computed(() => String(route.params.id))
</script>

<template>
  <ProjectShell :project-id="projectId" active="documents">
    <template #default>
      <ProjectSectionPlaceholder
        title="Страницы проекта"
        description="Управление деревом страниц и документацией появится в следующем срезе."
      />
    </template>
  </ProjectShell>
</template>
