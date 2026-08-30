<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'
import { Menu, FileQuestion } from '@lucide/vue'
import { PublicDocumentationActions } from '../model/public-documentation-actions'
import { usePublicDocumentationStore } from '../model/public-documentation-state'
import PublicDocumentContentNode from './PublicDocumentContentNode.vue'
import PublicDocumentTree from './PublicDocumentTree.vue'

const props = defineProps<{ token: string, documentId?: string }>()
const store = usePublicDocumentationStore()
const actions = new PublicDocumentationActions()
const unavailable = computed(() => actions.error.value !== null)
const documentation = computed(() => store.documentation)
const hasNavigation = computed(() => documentation.value?.scope === 'branch' && documentation.value.tree.length > 0)

const load = async (): Promise<void> => {
  store.clear()
  const result = await actions.read(props.token, props.documentId)
  if (result) store.apply(result)
}

watch(() => [props.token, props.documentId] as const, () => { void load() }, { immediate: true })
onBeforeUnmount(() => store.clear())
useHead(() => ({
  title: documentation.value ? `${documentation.value.page.title} — ${documentation.value.projectName}` : 'Документация — Minerva',
  meta: [{ name: 'robots', content: 'noindex, nofollow, noarchive' }, { name: 'referrer', content: 'no-referrer' }],
}))
</script>

<template>
  <main class="mx-auto max-w-screen-2xl px-4 py-6 lg:px-6">
    <div v-if="actions.isPending.value" class="mx-auto max-w-4xl space-y-5 py-8" aria-label="Загрузка документации">
      <UiSkeleton class="h-5 w-40" /><UiSkeleton class="h-10 w-3/4" /><UiSkeleton class="h-4 w-full" /><UiSkeleton class="h-4 w-5/6" /><UiSkeleton class="h-48 w-full" />
    </div>

    <UiEmpty v-else-if="unavailable" class="mx-auto max-w-xl border border-dashed py-16" role="status">
      <UiEmptyHeader><UiEmptyMedia variant="icon"><FileQuestion /></UiEmptyMedia><UiEmptyTitle>Документация недоступна</UiEmptyTitle><UiEmptyDescription>Ссылка могла быть отключена или страница больше не опубликована.</UiEmptyDescription></UiEmptyHeader>
      <UiEmptyContent><UiButton as-child variant="outline"><NuxtLink to="/auth">Войти в Minerva</NuxtLink></UiButton></UiEmptyContent>
    </UiEmpty>

    <div v-else-if="documentation" :class="hasNavigation ? 'lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10' : ''">
      <aside v-if="hasNavigation" class="hidden lg:block">
        <div class="sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto">
          <p class="mb-3 truncate px-2 text-sm font-semibold">{{ documentation.projectName }}</p>
          <PublicDocumentTree :nodes="documentation.tree" :token="token" :current-id="documentation.page.id" />
        </div>
      </aside>

      <article :class="hasNavigation ? 'min-w-0 max-w-4xl' : 'mx-auto min-w-0 max-w-4xl'">
        <UiSheet v-if="hasNavigation">
          <UiSheetTrigger as-child><UiButton variant="outline" size="sm" class="mb-5 lg:hidden"><Menu class="mr-2 size-4" />Навигация</UiButton></UiSheetTrigger>
          <UiSheetContent side="left" class="w-[85vw] max-w-sm overflow-y-auto">
            <UiSheetHeader><UiSheetTitle>{{ documentation.projectName }}</UiSheetTitle><UiSheetDescription>Опубликованные страницы документации</UiSheetDescription></UiSheetHeader>
            <PublicDocumentTree :nodes="documentation.tree" :token="token" :current-id="documentation.page.id" class="mt-6" />
          </UiSheetContent>
        </UiSheet>
        <p class="mb-2 text-sm text-muted-foreground">{{ documentation.projectName }}</p>
        <h1 class="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">{{ documentation.page.title }}</h1>
        <div class="mt-6 space-y-3">
          <PublicDocumentContentNode v-for="(node, index) in documentation.page.content.content ?? []" :key="index" :node="node" :token="token" :links="documentation.page.internalLinks" />
        </div>
      </article>
    </div>
  </main>
</template>
