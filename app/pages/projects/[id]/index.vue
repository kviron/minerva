<script setup lang="ts">
import { computed } from 'vue'
import { ProjectOverview, ProjectShell } from '@/features/projects'

const route = useRoute()
const projectId = computed(() => String(route.params.id))
</script>

<template>
  <ProjectShell :project-id="projectId" active="overview">
    <template #default="{ project }">
      <ProjectOverview :project="project" />
    </template>
  </ProjectShell>
</template>
