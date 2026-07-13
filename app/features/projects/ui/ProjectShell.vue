<script setup lang="ts">
import { watch } from 'vue'
import type { ProjectSection } from '../model/project-sections'
import { useProjectOverview } from '../model/use-project-overview'

const props = defineProps<{
  projectId: string
  active: ProjectSection
}>()

const { project, pending, error, load } = useProjectOverview(() => props.projectId)

watch(() => props.projectId, load, { immediate: true })
</script>

<template>
  <div class="flex flex-col gap-4 px-4 lg:px-6">
    <template v-if="pending">
      <div class="flex flex-col gap-2">
        <UiSkeleton class="h-8 w-64" />
        <UiSkeleton class="h-4 w-full max-w-xl" />
      </div>
      <UiSkeleton class="h-8 w-80" />
      <UiSkeleton class="h-48 w-full" />
    </template>

    <UiEmpty v-else-if="error" class="border border-dashed" role="alert">
      <UiEmptyHeader>
        <UiEmptyTitle>Проект недоступен</UiEmptyTitle>
        <UiEmptyDescription>{{ error }}</UiEmptyDescription>
      </UiEmptyHeader>
      <UiEmptyContent>
        <UiButton variant="outline" size="sm" @click="load">Обновить</UiButton>
      </UiEmptyContent>
    </UiEmpty>

    <template v-else-if="project">
      <div class="flex flex-col gap-1">
        <NuxtLink to="/projects" class="text-sm text-muted-foreground hover:underline">Проекты</NuxtLink>
        <h1 class="text-2xl font-semibold">{{ project.name }}</h1>
        <p class="text-sm text-muted-foreground">
          {{ project.description || 'Описание проекта пока не добавлено.' }}
        </p>
      </div>

      <slot :project="project" />
    </template>
  </div>
</template>
