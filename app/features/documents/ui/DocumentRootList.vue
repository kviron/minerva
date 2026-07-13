<script setup lang="ts">
import { ChevronRight, FileText } from '@lucide/vue'
import type { RootDocumentListItem } from '../../../../shared/documents/contracts'
import { formatChildCount, formatDocumentUpdatedAt } from '../model/presentation'

defineProps<{
  projectId: string
  documents: readonly RootDocumentListItem[]
}>()
</script>

<template>
  <UiCard>
    <UiCardHeader>
      <UiCardTitle>Разделы документации</UiCardTitle>
      <UiCardDescription>Корневые страницы образуют первый уровень дерева проекта.</UiCardDescription>
    </UiCardHeader>
    <UiCardContent class="p-0">
      <ul>
        <li v-for="(document, index) in documents" :key="document.id">
          <UiSeparator v-if="index > 0" />
          <NuxtLink
            :to="`/projects/${projectId}/documents/${document.id}`"
            class="group flex items-center gap-3 px-6 py-4 transition-colors hover:bg-muted/50"
          >
            <FileText class="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span class="flex min-w-0 flex-1 flex-col gap-0.5">
              <span class="block truncate text-base font-semibold">{{ document.title }}</span>
              <span class="block text-xs text-muted-foreground">
                {{ formatChildCount(document.childCount) }} · обновлено {{ formatDocumentUpdatedAt(document.updatedAt) }}
              </span>
            </span>
            <span v-if="document.publicationState === 'draft'" class="text-xs text-muted-foreground">Черновик</span>
            <ChevronRight class="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          </NuxtLink>
        </li>
      </ul>
    </UiCardContent>
  </UiCard>
</template>
