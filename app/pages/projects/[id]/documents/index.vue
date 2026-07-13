<script setup lang="ts">
import { computed } from 'vue'
import { DocumentsProvider, DocumentsView } from '@/features/documents'
import { ProjectShell } from '@/features/projects'

const route = useRoute()
const projectId = computed(() => String(route.params.id))
</script>

<template>
  <ProjectShell :project-id="projectId" active="documents">
    <DocumentsProvider>
      <DocumentsView :project-id="projectId" />
    </DocumentsProvider>
  </ProjectShell>
</template>
