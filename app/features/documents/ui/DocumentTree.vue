<script setup lang="ts">
import type { DocumentTreeNode } from '../../../../shared/documents/contracts'
import DocumentTreeBranch from './DocumentTreeBranch.vue'

defineProps<{
  projectId: string
  nodes: readonly DocumentTreeNode[]
  activeDocumentId: string
}>()
</script>

<template>
  <nav class="min-w-0 border-b pb-4 lg:border-r lg:border-b-0 lg:pr-4" aria-label="Дерево документации">
    <div class="mb-2 text-sm font-medium">Страницы</div>
    <UiScrollArea class="h-56 lg:h-[calc(100vh-11rem)]">
      <ul class="flex flex-col gap-0.5 pr-3">
        <DocumentTreeBranch
          v-for="node in nodes"
          :key="node.id"
          :project-id="projectId"
          :node="node"
          :active-document-id="activeDocumentId"
        />
      </ul>
    </UiScrollArea>
  </nav>
</template>
