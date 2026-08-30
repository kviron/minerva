<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'
import type { DocumentContentMark, DocumentContentNode } from '../../../../shared/documents/contracts'
import type { PublicDocumentInternalLink } from '../../../../shared/documents/public-share-contracts'
import { documentImageHeight, documentImageId, documentImageWidth } from '../../documents/model/document-image'
import DocumentExternalEmbed from '../../documents/ui/embeds/DocumentExternalEmbed.vue'
import { publicDocumentImageUrl, publicDocumentRoute } from '../model/public-documentation-links'

const props = defineProps<{ node: DocumentContentNode, token: string, links: readonly PublicDocumentInternalLink[] }>()
const mark = (type: string): DocumentContentMark | undefined => props.node.marks?.find(item => item.type === type)
const href = computed(() => mark('link')?.attrs?.href)
const internalId = computed(() => typeof href.value === 'string' ? /^document:([0-9a-f-]{36})$/iu.exec(href.value)?.[1]?.toLowerCase() ?? null : null)
const internalAvailable = computed(() => internalId.value !== null && props.links.some(link => link.documentId === internalId.value && link.available))
const safeLink = computed(() => typeof href.value === 'string' && /^(?:https?:|mailto:)/u.test(href.value) ? href.value : null)
const imageId = computed(() => documentImageId(props.node.attrs?.imageId))
const imageWidth = computed(() => documentImageWidth(props.node.attrs?.width))
const imageHeight = computed(() => documentImageHeight(props.node.attrs?.height))
const textClass = computed(() => cn(mark('bold') && 'font-semibold', mark('italic') && 'italic', mark('strike') && 'line-through', mark('underline') && 'underline underline-offset-4', mark('code') && 'rounded bg-muted px-1 py-0.5 font-mono text-sm'))
const headingTag = computed(() => { const level = props.node.attrs?.level; return typeof level === 'number' && level >= 1 && level <= 6 ? `h${level}` : 'h2' })
const headingClass = computed(() => { const level = props.node.attrs?.level; return cn('scroll-m-20 font-semibold tracking-tight', level === 1 && 'text-4xl font-extrabold text-balance', level === 2 && 'mt-8 border-b pb-2 text-3xl', level === 3 && 'mt-6 text-2xl', level === 4 && 'mt-5 text-xl', (typeof level !== 'number' || level >= 5) && 'mt-4 text-lg') })
const span = (value: unknown): number => typeof value === 'number' && Number.isInteger(value) && value >= 1 ? value : 1
</script>

<template>
  <NuxtLink v-if="node.type === 'text' && internalId && internalAvailable" :to="publicDocumentRoute(token, internalId)" :class="cn('text-primary underline underline-offset-4', textClass)">{{ node.text ?? '' }}</NuxtLink>
  <span v-else-if="node.type === 'text' && internalId" :class="cn('text-muted-foreground line-through', textClass)" title="Страница недоступна">{{ node.text ?? 'Страница недоступна' }}</span>
  <a v-else-if="node.type === 'text' && safeLink" :href="safeLink" target="_blank" rel="noopener noreferrer" :class="cn('text-primary underline underline-offset-4', textClass)">{{ node.text ?? '' }}</a>
  <span v-else-if="node.type === 'text'" :class="textClass">{{ node.text ?? '' }}</span>
  <img v-else-if="node.type === 'image' && imageId" :src="publicDocumentImageUrl(token, imageId)" :alt="typeof node.attrs?.alt === 'string' ? node.attrs.alt : ''" class="my-3 max-w-full rounded-md object-cover" :style="imageWidth || imageHeight ? { width: imageWidth ? `${imageWidth}px` : undefined, height: imageHeight ? `${imageHeight}px` : undefined } : undefined" loading="lazy" referrerpolicy="no-referrer">
  <DocumentExternalEmbed v-else-if="node.type === 'externalEmbed'" :node="node" />
  <br v-else-if="node.type === 'hardBreak'">
  <UiSeparator v-else-if="node.type === 'horizontalRule'" class="my-4" />
  <component :is="headingTag" v-else-if="node.type === 'heading'" :class="headingClass"><PublicDocumentContentNode v-for="(child, index) in node.content ?? []" :key="index" :node="child" :token="token" :links="links" /></component>
  <p v-else-if="node.type === 'paragraph'" class="min-h-5 leading-7"><PublicDocumentContentNode v-for="(child, index) in node.content ?? []" :key="index" :node="child" :token="token" :links="links" /></p>
  <ul v-else-if="node.type === 'bulletList'" class="my-2 ml-6 list-disc"><PublicDocumentContentNode v-for="(child, index) in node.content ?? []" :key="index" :node="child" :token="token" :links="links" /></ul>
  <ol v-else-if="node.type === 'orderedList'" class="my-2 ml-6 list-decimal"><PublicDocumentContentNode v-for="(child, index) in node.content ?? []" :key="index" :node="child" :token="token" :links="links" /></ol>
  <li v-else-if="node.type === 'listItem'" class="pl-1"><PublicDocumentContentNode v-for="(child, index) in node.content ?? []" :key="index" :node="child" :token="token" :links="links" /></li>
  <blockquote v-else-if="node.type === 'blockquote'" class="my-3 border-l-2 pl-4 italic text-muted-foreground"><PublicDocumentContentNode v-for="(child, index) in node.content ?? []" :key="index" :node="child" :token="token" :links="links" /></blockquote>
  <pre v-else-if="node.type === 'codeBlock'" class="my-3 overflow-x-auto rounded-md bg-muted p-3 text-sm"><code><PublicDocumentContentNode v-for="(child, index) in node.content ?? []" :key="index" :node="child" :token="token" :links="links" /></code></pre>
  <div v-else-if="node.type === 'table'" class="my-3 overflow-x-auto rounded-md border"><table class="w-full border-collapse"><tbody><PublicDocumentContentNode v-for="(child, index) in node.content ?? []" :key="index" :node="child" :token="token" :links="links" /></tbody></table></div>
  <tr v-else-if="node.type === 'tableRow'" class="border-b"><PublicDocumentContentNode v-for="(child, index) in node.content ?? []" :key="index" :node="child" :token="token" :links="links" /></tr>
  <th v-else-if="node.type === 'tableHeader'" :colspan="span(node.attrs?.colspan)" :rowspan="span(node.attrs?.rowspan)" class="border-r bg-muted/60 px-3 py-2 align-top"><PublicDocumentContentNode v-for="(child, index) in node.content ?? []" :key="index" :node="child" :token="token" :links="links" /></th>
  <td v-else-if="node.type === 'tableCell'" :colspan="span(node.attrs?.colspan)" :rowspan="span(node.attrs?.rowspan)" class="border-r px-3 py-2 align-top"><PublicDocumentContentNode v-for="(child, index) in node.content ?? []" :key="index" :node="child" :token="token" :links="links" /></td>
  <template v-else><PublicDocumentContentNode v-for="(child, index) in node.content ?? []" :key="index" :node="child" :token="token" :links="links" /></template>
</template>
