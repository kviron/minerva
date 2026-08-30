<script setup lang="ts">
import { FileText, SearchX } from '@lucide/vue'
import type { DocumentSearchResultItem } from '../../../../shared/documents/contracts'
import { DOCUMENT_PUBLICATION_STATE } from '../../../../shared/documents/constants'

defineProps<{
  projectId: string
  results: readonly DocumentSearchResultItem[]
}>()

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium' }).format(new Date(value))
</script>

<template>
  <UiEmpty v-if="results.length === 0" class="border border-dashed">
    <UiEmptyHeader>
      <UiEmptyMedia variant="icon"><SearchX /></UiEmptyMedia>
      <UiEmptyTitle>Ничего не найдено</UiEmptyTitle>
      <UiEmptyDescription>Попробуйте изменить поисковый запрос.</UiEmptyDescription>
    </UiEmptyHeader>
  </UiEmpty>

  <div v-else class="flex flex-col gap-2" aria-live="polite">
    <NuxtLink
      v-for="result in results"
      :key="result.id"
      :to="`/projects/${projectId}/documents/${result.id}`"
      class="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <UiCard>
        <UiCardHeader class="flex-row items-start gap-3">
          <FileText class="mt-0.5 shrink-0 text-muted-foreground" />
          <div class="flex min-w-0 flex-1 flex-col gap-1">
            <UiCardTitle class="truncate">{{ result.title }}</UiCardTitle>
            <UiCardDescription class="line-clamp-2">{{ result.excerpt || 'Текст страницы отсутствует.' }}</UiCardDescription>
          </div>
          <UiBadge v-if="result.publicationState === DOCUMENT_PUBLICATION_STATE.DRAFT" variant="secondary">
            Черновик
          </UiBadge>
        </UiCardHeader>
        <UiCardContent class="pl-11">
          <UiCardDescription>Обновлено {{ formatDate(result.updatedAt) }}</UiCardDescription>
        </UiCardContent>
      </UiCard>
    </NuxtLink>
  </div>
</template>
