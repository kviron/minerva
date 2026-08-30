<script setup lang="ts">
import { ChevronRight, Pencil, Share2 } from '@lucide/vue'
import { computed, provide, ref } from 'vue'
import { useProjectOverviewStore } from '@/features/projects'
import type { DocumentDetailResponse, DocumentTreeNode } from '../../../../shared/documents/contracts'
import { PROJECT_PERMISSION } from '../../../../shared/projects/constants'
import { formatDocumentUpdatedAt } from '../model/presentation'
import { DOCUMENT_LINK_CONTEXT } from '../model/document-link-context'
import DocumentContentNode from './DocumentContentNode.vue'
import DocumentVersionControls from './DocumentVersionControls.vue'
import DocumentShareDialog from './DocumentShareDialog.vue'
import { useDocumentsStore } from '../model/documents-state'

const props = defineProps<{
  projectId: string
  document: DocumentDetailResponse
}>()

const projectState = useProjectOverviewStore()
const documentsState = useDocumentsStore()
const shareDialogOpen = ref(false)
const canEdit = computed(() => {
  const project = projectState.project
  return project?.id === props.projectId
    && project.permissions.includes(PROJECT_PERMISSION.DOCUMENTS_UPDATE_DRAFT)
})
const linkContext = computed(() => ({
  projectId: props.projectId,
  targets: new Map(props.document.internalLinks.map(target => [target.id, target])),
}))
const canShare = computed(() => {
  const project = projectState.project
  return project?.id === props.projectId
    && project.permissions.includes(PROJECT_PERMISSION.DOCUMENTS_SHARE)
})
const treeHasPublishedVersion = (nodes: readonly DocumentTreeNode[], documentId: string): boolean => {
  for (const node of nodes) {
    if (node.id === documentId) return node.hasPublishedVersions
    if (treeHasPublishedVersion(node.children, documentId)) return true
  }
  return false
}
const hasPublishedVersion = computed(() => treeHasPublishedVersion(documentsState.tree, props.document.id))
provide(DOCUMENT_LINK_CONTEXT, linkContext)
</script>

<template>
  <article class="min-w-0 pb-12">
    <nav v-if="document.ancestors.length > 0" class="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted-foreground" aria-label="Расположение страницы">
      <template v-for="ancestor in document.ancestors" :key="ancestor.id">
        <NuxtLink :to="`/projects/${projectId}/documents/${ancestor.id}`" class="hover:text-foreground hover:underline">
          {{ ancestor.title }}
        </NuxtLink>
        <ChevronRight class="size-4" aria-hidden="true" />
      </template>
    </nav>

    <header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex flex-col gap-2">
        <div class="flex flex-wrap items-center gap-2">
          <h1 class="text-3xl font-semibold tracking-tight">{{ document.title }}</h1>
          <span v-if="document.publicationState === 'draft'" class="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">Черновик</span>
        </div>
        <p class="text-sm text-muted-foreground">
          Обновлено {{ formatDocumentUpdatedAt(document.updatedAt) }} · ревизия {{ document.draftRevision }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <UiButton v-if="canShare" variant="outline" size="sm" @click="shareDialogOpen = true">
          <Share2 data-icon="inline-start" />
          Поделиться
        </UiButton>
        <UiButton v-if="canEdit" as-child variant="outline" size="sm">
          <NuxtLink :to="`/projects/${projectId}/documents/${document.id}/edit`">
            <Pencil data-icon="inline-start" />
            Редактировать
          </NuxtLink>
        </UiButton>
        <DocumentVersionControls :project-id="projectId" :document="document" />
      </div>
    </header>

    <UiSeparator class="my-6" />

    <div v-if="document.draftContent.content.length > 0" class="flex flex-col gap-2">
      <DocumentContentNode
        v-for="(node, index) in document.draftContent.content"
        :key="index"
        :node="node"
      />
    </div>
    <p v-else class="text-sm text-muted-foreground">Страница пока не содержит текста.</p>

    <template v-if="document.backlinks.length > 0">
      <UiSeparator class="my-6" />
      <section class="flex flex-col gap-3" aria-labelledby="document-backlinks-heading">
        <h2 id="document-backlinks-heading" class="text-lg font-semibold">На эту страницу ссылаются</h2>
        <ul class="flex flex-col gap-2">
          <li v-for="backlink in document.backlinks" :key="backlink.id">
            <NuxtLink
              :to="`/projects/${projectId}/documents/${backlink.id}`"
              class="text-sm text-primary hover:underline"
            >{{ backlink.title }}</NuxtLink>
          </li>
        </ul>
      </section>
    </template>

    <DocumentShareDialog
      :open="shareDialogOpen"
      :project-id="projectId"
      :document-id="document.id"
      :has-published-version="hasPublishedVersion"
      @update:open="shareDialogOpen = $event"
    />
  </article>
</template>
