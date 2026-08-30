<script setup lang="ts">
import type { DocumentTreeNode } from '../../../../shared/documents/contracts'
import DocumentOutlineTreeBranch from './DocumentOutlineTreeBranch.vue'

defineProps<{
  projectId: string
  nodes: readonly DocumentTreeNode[]
}>()
</script>

<template>
  <UiCard>
    <UiCardContent>
      <nav aria-label="Дерево документации">
        <ul class="flex flex-col">
          <DocumentOutlineTreeBranch
            v-for="node in nodes"
            :key="node.id"
            :project-id="projectId"
            :node="node"
          />
        </ul>
      </nav>
    </UiCardContent>
  </UiCard>
</template>
