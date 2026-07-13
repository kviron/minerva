<script setup lang="ts">
import { ChevronDown, ChevronRight, FileText } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { cn } from '@/lib/utils'
import type { DocumentTreeNode } from '../../../../shared/documents/contracts'

const props = defineProps<{
  projectId: string
  node: DocumentTreeNode
  activeDocumentId: string
}>()

const containsActive = (node: DocumentTreeNode, activeId: string): boolean =>
  node.id === activeId || node.children.some(child => containsActive(child, activeId))

const open = ref(containsActive(props.node, props.activeDocumentId))
const hasChildren = computed(() => props.node.children.length > 0)

watch(() => props.activeDocumentId, (activeId) => {
  if (containsActive(props.node, activeId)) {
    open.value = true
  }
})
</script>

<template>
  <li>
    <div class="flex min-w-0 items-center gap-1">
      <UiButton
        v-if="hasChildren"
        variant="ghost"
        size="icon-xs"
        :aria-label="open ? `Свернуть ${node.title}` : `Развернуть ${node.title}`"
        :aria-expanded="open"
        @click="open = !open"
      >
        <ChevronDown v-if="open" />
        <ChevronRight v-else />
      </UiButton>
      <NuxtLink
        :to="`/projects/${projectId}/documents/${node.id}`"
        :aria-current="node.id === activeDocumentId ? 'page' : undefined"
        :class="cn(
          'flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted',
          node.id === activeDocumentId && 'bg-muted font-medium',
        )"
      >
        <FileText class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span class="truncate">{{ node.title }}</span>
        <span v-if="node.publicationState === 'draft'" class="sr-only">Черновик</span>
      </NuxtLink>
    </div>

    <ul v-if="hasChildren && open" class="ml-3 flex flex-col gap-0.5 border-l pl-3">
      <DocumentTreeBranch
        v-for="child in node.children"
        :key="child.id"
        :project-id="projectId"
        :node="child"
        :active-document-id="activeDocumentId"
      />
    </ul>
  </li>
</template>
