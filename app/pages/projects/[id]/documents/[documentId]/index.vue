<script setup lang="ts">
import { computed } from 'vue'
import { DocumentsProvider, DocumentWorkspace } from '@/features/documents'
import { ProjectShell } from '@/features/projects'

const route = useRoute()
const projectId = computed(() => String(route.params.id))
const documentId = computed(() => String(route.params.documentId))
</script>

<template>
  <ProjectShell :project-id="projectId" active="documents">
    <DocumentsProvider>
      <DocumentWorkspace :project-id="projectId" :document-id="documentId" />
    </DocumentsProvider>
  </ProjectShell>
</template>
