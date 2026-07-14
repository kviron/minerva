<script setup lang="ts">
import { Archive, ChevronDown, ChevronRight, FilePlus2, FileText, MoreHorizontal, Move, Trash2 } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useProjectOverviewStore } from '@/features/projects'
import { cn } from '@/lib/utils'
import type { DocumentTreeNode } from '../../../../shared/documents/contracts'
import { PROJECT_PERMISSION } from '../../../../shared/projects/constants'

const props = defineProps<{
  projectId: string
  node: DocumentTreeNode
  activeDocumentId: string
}>()
const emit = defineEmits<{
  create: [node: DocumentTreeNode]
  move: [node: DocumentTreeNode]
  archive: [node: DocumentTreeNode]
  discard: [node: DocumentTreeNode]
}>()
const projectState = useProjectOverviewStore()

const containsActive = (node: DocumentTreeNode, activeId: string): boolean =>
  node.id === activeId || node.children.some(child => containsActive(child, activeId))

const open = ref(containsActive(props.node, props.activeDocumentId))
const hasChildren = computed(() => props.node.children.length > 0)
const canCreate = computed(() => projectState.project?.id === props.projectId
  && projectState.project.permissions.includes(PROJECT_PERMISSION.DOCUMENTS_CREATE))
const canMove = computed(() => projectState.project?.id === props.projectId
  && projectState.project.permissions.includes(PROJECT_PERMISSION.DOCUMENTS_MOVE))
const canArchive = computed(() => projectState.project?.id === props.projectId
  && projectState.project.permissions.includes(PROJECT_PERMISSION.DOCUMENTS_ARCHIVE))
const isDiscardableBranch = (node: DocumentTreeNode): boolean =>
  node.publicationState === 'draft'
  && !node.hasPublishedVersions
  && node.children.every(isDiscardableBranch)
const canDiscardBranch = computed(() => isDiscardableBranch(props.node))

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
      <UiDropdownMenu v-if="canCreate || canMove || canArchive">
        <UiDropdownMenuTrigger as-child>
          <UiButton variant="ghost" size="icon-xs" :aria-label="`Действия со страницей ${node.title}`">
            <MoreHorizontal />
          </UiButton>
        </UiDropdownMenuTrigger>
        <UiDropdownMenuContent align="end">
          <UiDropdownMenuGroup>
            <UiDropdownMenuItem v-if="canCreate" @select="emit('create', node)">
              <FilePlus2 />
              Добавить
            </UiDropdownMenuItem>
            <UiDropdownMenuItem v-if="canMove" @select="emit('move', node)">
              <Move />
              Переместить
            </UiDropdownMenuItem>
            <UiDropdownMenuItem
              v-if="canArchive && canDiscardBranch"
              variant="destructive"
              @select="emit('discard', node)"
            >
              <Trash2 />
              Удалить
            </UiDropdownMenuItem>
            <UiDropdownMenuItem v-else-if="canArchive" variant="destructive" @select="emit('archive', node)">
              <Archive />
              В архив
            </UiDropdownMenuItem>
          </UiDropdownMenuGroup>
        </UiDropdownMenuContent>
      </UiDropdownMenu>
    </div>

    <ul v-if="hasChildren && open" class="ml-3 flex flex-col gap-0.5 border-l pl-3">
      <DocumentTreeBranch
        v-for="child in node.children"
        :key="child.id"
        :project-id="projectId"
        :node="child"
        :active-document-id="activeDocumentId"
        @create="emit('create', $event)"
        @move="emit('move', $event)"
        @archive="emit('archive', $event)"
        @discard="emit('discard', $event)"
      />
    </ul>
  </li>
</template>
