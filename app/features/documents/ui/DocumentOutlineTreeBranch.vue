<script setup lang="ts">
import { FileText } from '@lucide/vue'
import type { DocumentTreeNode } from '../../../../shared/documents/contracts'

defineProps<{
  projectId: string
  node: DocumentTreeNode
}>()
</script>

<template>
  <li>
    <NuxtLink
      :to="`/projects/${projectId}/documents/${node.id}`"
      class="flex min-w-0 items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors hover:bg-muted"
    >
      <FileText class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span class="truncate">{{ node.title }}</span>
      <span v-if="node.publicationState === 'draft'" class="sr-only">Черновик</span>
    </NuxtLink>
    <ul v-if="node.children.length > 0" class="ml-3 flex flex-col border-l pl-3">
      <DocumentOutlineTreeBranch
        v-for="child in node.children"
        :key="child.id"
        :project-id="projectId"
        :node="child"
      />
    </ul>
  </li>
</template>
