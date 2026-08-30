<script setup lang="ts">
import { computed } from 'vue'
import type { DocumentContentNode } from '../../../../../shared/documents/contracts'
import {
  buildFigmaEmbedUrl,
  buildFigmaExternalUrl,
  parseFigmaEmbedDescriptor,
} from '../../../../../shared/embeds/figma'
import type { EmbedTheme } from '../../../../../shared/embeds/constants'

const props = defineProps<{ node: DocumentContentNode }>()
const colorMode = useColorMode()
const descriptor = computed(() => parseFigmaEmbedDescriptor(props.node.attrs))
const embedTheme = computed<EmbedTheme>(() => colorMode.value === 'dark' ? 'dark' : 'light')
const embedUrl = computed(() => descriptor.value ? buildFigmaEmbedUrl(descriptor.value, embedTheme.value) : null)
const externalUrl = computed(() => descriptor.value ? buildFigmaExternalUrl(descriptor.value) : null)
</script>

<template>
  <figure
    v-if="descriptor && embedUrl && externalUrl"
    class="my-3 max-w-full self-start overflow-hidden rounded-md border bg-background"
    :style="{ width: `min(100%, ${descriptor.width}px)` }"
  >
    <figcaption class="flex items-center justify-between gap-3 border-b px-3 py-2 text-sm">
      <span class="truncate font-medium">{{ descriptor.title }}</span>
      <a
        :href="externalUrl"
        class="shrink-0 text-primary underline underline-offset-4"
        target="_blank"
        rel="noopener noreferrer"
      >Открыть в Figma</a>
    </figcaption>
    <iframe
      :src="embedUrl"
      :title="descriptor.title"
      :height="descriptor.height"
      class="block w-full border-0"
      loading="lazy"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
      allow="fullscreen"
      referrerpolicy="no-referrer"
    />
  </figure>
  <UiAlert v-else variant="destructive">
    <UiAlertTitle>Внешний материал недоступен</UiAlertTitle>
    <UiAlertDescription>Описание виджета имеет неподдерживаемый формат.</UiAlertDescription>
  </UiAlert>
</template>
