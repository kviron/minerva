<script setup lang="ts">
import { computed, inject } from 'vue'
import { cn } from '@/lib/utils'
import type { DocumentContentMark, DocumentContentNode } from '../../../../shared/documents/contracts'
import { DOCUMENT_LINK_CONTEXT } from '../model/document-link-context'
import { documentImageId, documentImageUrl } from '../model/document-image'

const props = defineProps<{ node: DocumentContentNode }>()
const linkContext = inject(DOCUMENT_LINK_CONTEXT, null)

const mark = (type: string): DocumentContentMark | undefined => props.node.marks?.find(item => item.type === type)
const safeLink = computed(() => {
  const href = mark('link')?.attrs?.href
  if (typeof href !== 'string') {
    return null
  }
  return /^(?:https?:|mailto:|\/)/u.test(href) ? href : null
})
const internalTargetId = computed(() => {
  const href = mark('link')?.attrs?.href
  if (typeof href !== 'string') return null
  const match = /^document:([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/iu.exec(href)
  return match?.[1]?.toLowerCase() ?? null
})
const internalTarget = computed(() => {
  const targetId = internalTargetId.value
  return targetId && linkContext?.value.targets.get(targetId) || null
})
const imageId = computed(() => documentImageId(props.node.attrs?.imageId))
const imageAlt = computed(() => typeof props.node.attrs?.alt === 'string' ? props.node.attrs.alt : '')
const textClass = computed(() => cn(
  mark('bold') && 'font-semibold',
  mark('italic') && 'italic',
  mark('strike') && 'line-through',
  mark('underline') && 'underline underline-offset-4',
  mark('code') && 'rounded bg-muted px-1 py-0.5 font-mono text-sm',
))
const headingTag = computed(() => {
  const level = props.node.attrs?.level
  return level === 1 || level === 2 || level === 3 || level === 4 || level === 5 || level === 6
    ? `h${level}`
    : 'h2'
})
const headingClass = computed(() => {
  const level = props.node.attrs?.level
  return cn(
    'scroll-m-20 font-semibold tracking-tight',
    level === 1 && 'text-3xl',
    level === 2 && 'mt-8 text-2xl',
    level === 3 && 'mt-6 text-xl',
    (typeof level !== 'number' || level >= 4) && 'mt-4 text-lg',
  )
})
</script>

<template>
  <NuxtLink
    v-if="node.type === 'text' && internalTargetId && internalTarget && linkContext"
    :to="`/projects/${linkContext.projectId}/documents/${internalTarget.id}`"
    :class="cn('text-primary underline underline-offset-4', textClass)"
  >{{ node.text ?? internalTarget.title }}</NuxtLink>
  <span
    v-else-if="node.type === 'text' && internalTargetId"
    :class="cn('text-muted-foreground line-through', textClass)"
    title="Недоступная страница"
  >{{ node.text ?? 'Недоступная страница' }}</span>
  <a
    v-else-if="node.type === 'text' && safeLink"
    :href="safeLink"
    :class="cn('text-primary underline underline-offset-4', textClass)"
    rel="noopener noreferrer"
  >{{ node.text ?? '' }}</a>
  <span v-else-if="node.type === 'text'" :class="textClass">{{ node.text ?? '' }}</span>
  <img
    v-else-if="node.type === 'image' && imageId && linkContext"
    :src="documentImageUrl(linkContext.projectId, imageId)"
    :alt="imageAlt"
    class="my-4 max-h-[40rem] max-w-full rounded-md border object-contain"
    loading="lazy"
  >
  <p v-else-if="node.type === 'image'" class="text-sm text-muted-foreground">Недоступное изображение</p>
  <br v-else-if="node.type === 'hardBreak'">
  <UiSeparator v-else-if="node.type === 'horizontalRule'" class="my-6" />
  <component :is="headingTag" v-else-if="node.type === 'heading'" :class="headingClass">
    <DocumentContentNode v-for="(child, index) in node.content ?? []" :key="index" :node="child" />
  </component>
  <p v-else-if="node.type === 'paragraph'" class="min-h-5 leading-7">
    <DocumentContentNode v-for="(child, index) in node.content ?? []" :key="index" :node="child" />
  </p>
  <ul v-else-if="node.type === 'bulletList'" class="my-4 list-disc pl-6">
    <DocumentContentNode v-for="(child, index) in node.content ?? []" :key="index" :node="child" />
  </ul>
  <ol v-else-if="node.type === 'orderedList'" class="my-4 list-decimal pl-6">
    <DocumentContentNode v-for="(child, index) in node.content ?? []" :key="index" :node="child" />
  </ol>
  <li v-else-if="node.type === 'listItem'" class="pl-1">
    <DocumentContentNode v-for="(child, index) in node.content ?? []" :key="index" :node="child" />
  </li>
  <blockquote v-else-if="node.type === 'blockquote'" class="my-4 border-l-2 pl-4 text-muted-foreground">
    <DocumentContentNode v-for="(child, index) in node.content ?? []" :key="index" :node="child" />
  </blockquote>
  <pre v-else-if="node.type === 'codeBlock'" class="my-4 overflow-x-auto rounded-md bg-muted p-4 text-sm"><code><DocumentContentNode v-for="(child, index) in node.content ?? []" :key="index" :node="child" /></code></pre>
  <template v-else>
    <DocumentContentNode v-for="(child, index) in node.content ?? []" :key="index" :node="child" />
  </template>
</template>
