<script setup lang="ts">
import {
  Download,
  ExternalLink,
  FileText,
  History,
  ImageIcon,
  Link2,
  PanelRightIcon,
} from '@lucide/vue'
import { computed, ref } from 'vue'
import type { DocumentDetailResponse, DocumentVersionSummary } from '../../../../shared/documents/contracts'
import {
  collectDocumentAttachments,
  DOCUMENT_DETAILS_TAB,
  type DocumentImageAttachment,
} from '../model/document-attachments'
import { formatDocumentUpdatedAt } from '../model/presentation'

const props = defineProps<{
  projectId: string
  document: DocumentDetailResponse
  canViewHistory: boolean
  versions: readonly DocumentVersionSummary[]
  loadingHistory: boolean
  historyError: string | null
}>()
const emit = defineEmits<{
  openHistory: []
  selectVersion: [version: DocumentVersionSummary]
}>()

const panelOpen = ref(false)
const selectedImage = ref<DocumentImageAttachment | null>(null)
const attachments = computed(() => collectDocumentAttachments({
  projectId: props.projectId,
  content: props.document.draftContent,
  internalLinks: props.document.internalLinks,
}))

const setPanelOpen = (open: boolean): void => {
  panelOpen.value = open
  if (!open) {
    selectedImage.value = null
  }
}

const openHistory = (): void => {
  emit('openHistory')
}

const setImagePreviewOpen = (open: boolean): void => {
  if (!open) {
    selectedImage.value = null
  }
}
</script>

<template>
  <UiButton
    type="button"
    variant="outline"
    size="icon-sm"
    aria-label="Открыть сведения о странице"
    title="Открыть сведения о странице"
    @click="setPanelOpen(true)"
  >
    <PanelRightIcon />
  </UiButton>

  <UiSheet :open="panelOpen" @update:open="setPanelOpen">
    <UiSheetContent class="flex data-[side=right]:w-full sm:max-w-md">
      <UiSheetHeader>
        <UiSheetTitle>{{ document.title }}</UiSheetTitle>
        <UiSheetDescription>Изображения, файлы, ссылки и история страницы.</UiSheetDescription>
      </UiSheetHeader>

      <UiTabs :default-value="DOCUMENT_DETAILS_TAB.IMAGES" class="min-h-0 flex-1 px-4 pb-4">
        <UiTabsList variant="line" class="w-full">
          <UiTabsTrigger :value="DOCUMENT_DETAILS_TAB.IMAGES" aria-label="Изображения">
            <ImageIcon />
            Изображения
          </UiTabsTrigger>
          <UiTabsTrigger :value="DOCUMENT_DETAILS_TAB.FILES" aria-label="Файлы">
            <FileText />
            Файлы
          </UiTabsTrigger>
          <UiTabsTrigger :value="DOCUMENT_DETAILS_TAB.LINKS" aria-label="Ссылки">
            <Link2 />
            Ссылки
          </UiTabsTrigger>
          <UiTabsTrigger
            v-if="canViewHistory"
            :value="DOCUMENT_DETAILS_TAB.HISTORY"
            aria-label="История"
            @click="openHistory"
          >
            <History />
            История
          </UiTabsTrigger>
        </UiTabsList>

        <UiTabsContent :value="DOCUMENT_DETAILS_TAB.IMAGES" class="min-h-0">
          <UiScrollArea v-if="attachments.images.length > 0" class="h-full">
            <div class="grid grid-cols-3 gap-1 pr-3">
              <UiButton
                v-for="image in attachments.images"
                :key="image.id"
                type="button"
                variant="ghost"
                class="aspect-square h-auto overflow-hidden rounded-md p-0"
                :aria-label="image.alt || 'Открыть изображение'"
                @click="selectedImage = image"
              >
                <img :src="image.url" :alt="image.alt" class="size-full object-cover" loading="lazy">
              </UiButton>
            </div>
          </UiScrollArea>
          <UiEmpty v-else class="border border-dashed">
            <UiEmptyHeader>
              <UiEmptyTitle>Изображений пока нет</UiEmptyTitle>
              <UiEmptyDescription>Добавленные в документ изображения появятся здесь.</UiEmptyDescription>
            </UiEmptyHeader>
          </UiEmpty>
        </UiTabsContent>

        <UiTabsContent :value="DOCUMENT_DETAILS_TAB.FILES">
          <UiEmpty class="border border-dashed">
            <UiEmptyHeader>
              <UiEmptyTitle>Файлов пока нет</UiEmptyTitle>
              <UiEmptyDescription>Поддержку PDF, архивов и других файлов добавим следующим этапом.</UiEmptyDescription>
            </UiEmptyHeader>
          </UiEmpty>
        </UiTabsContent>

        <UiTabsContent :value="DOCUMENT_DETAILS_TAB.LINKS" class="min-h-0">
          <UiScrollArea v-if="attachments.links.length > 0" class="h-full">
            <ul class="flex flex-col gap-1 pr-3">
              <li v-for="link in attachments.links" :key="link.href">
                <UiButton v-if="link.kind === 'internal'" as-child variant="ghost" class="h-auto w-full justify-start py-2 text-left">
                  <NuxtLink :to="link.href">
                    <Link2 />
                    <span class="truncate">{{ link.label }}</span>
                  </NuxtLink>
                </UiButton>
                <UiButton v-else as-child variant="ghost" class="h-auto w-full justify-start py-2 text-left">
                  <a :href="link.href" target="_blank" rel="noopener noreferrer">
                    <ExternalLink />
                    <span class="truncate">{{ link.label }}</span>
                  </a>
                </UiButton>
              </li>
            </ul>
          </UiScrollArea>
          <UiEmpty v-else class="border border-dashed">
            <UiEmptyHeader>
              <UiEmptyTitle>Ссылок пока нет</UiEmptyTitle>
              <UiEmptyDescription>Ссылки и материалы Figma из документа появятся здесь.</UiEmptyDescription>
            </UiEmptyHeader>
          </UiEmpty>
        </UiTabsContent>

        <UiTabsContent v-if="canViewHistory" :value="DOCUMENT_DETAILS_TAB.HISTORY" class="min-h-0">
          <p v-if="historyError" class="text-sm text-destructive" role="alert">{{ historyError }}</p>
          <div v-if="loadingHistory && versions.length === 0" class="flex min-h-40 items-center justify-center">
            <UiSpinner />
          </div>
          <UiEmpty v-else-if="versions.length === 0" class="border border-dashed">
            <UiEmptyHeader>
              <UiEmptyTitle>Опубликованных версий пока нет</UiEmptyTitle>
              <UiEmptyDescription>Первая версия появится после публикации страницы.</UiEmptyDescription>
            </UiEmptyHeader>
          </UiEmpty>
          <UiScrollArea v-else class="h-full">
            <ol class="flex flex-col gap-2 pr-3">
              <li v-for="version in versions" :key="version.versionNumber">
                <UiButton
                  type="button"
                  variant="outline"
                  class="h-auto w-full justify-start p-3 text-left"
                  @click="emit('selectVersion', version)"
                >
                  <span class="flex min-w-0 flex-1 flex-col items-start gap-1">
                    <span class="flex w-full items-center justify-between gap-3">
                      <span class="font-medium">Версия {{ version.versionNumber }}</span>
                      <span class="shrink-0 text-xs text-muted-foreground">{{ formatDocumentUpdatedAt(version.publishedAt) }}</span>
                    </span>
                    <span class="flex w-full items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span class="truncate">{{ version.changeSummary || 'Без комментария' }}</span>
                      <span class="shrink-0">{{ version.publishedByName }}</span>
                    </span>
                  </span>
                </UiButton>
              </li>
            </ol>
          </UiScrollArea>
        </UiTabsContent>
      </UiTabs>
    </UiSheetContent>
  </UiSheet>

  <UiDialog :open="selectedImage !== null" @update:open="setImagePreviewOpen">
    <UiDialogContent class="flex max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] flex-col sm:max-w-6xl">
      <UiDialogHeader>
        <UiDialogTitle>{{ selectedImage?.alt || 'Изображение' }}</UiDialogTitle>
        <UiDialogDescription>Просмотр изображения из документа.</UiDialogDescription>
      </UiDialogHeader>
      <div v-if="selectedImage" class="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-md bg-muted">
        <img :src="selectedImage.url" :alt="selectedImage.alt" class="max-h-[calc(100vh-10rem)] max-w-full object-contain">
      </div>
      <UiDialogFooter v-if="selectedImage">
        <UiButton as-child>
          <a :href="selectedImage.downloadUrl" download>
            <Download data-icon="inline-start" />
            Скачать
          </a>
        </UiButton>
      </UiDialogFooter>
    </UiDialogContent>
  </UiDialog>
</template>
