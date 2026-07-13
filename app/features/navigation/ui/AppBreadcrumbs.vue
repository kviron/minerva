<script setup lang="ts">
import { computed } from 'vue'
import { useDocumentsStore } from '@/features/documents'
import { projectIdFromPath, useProjectOverviewStore, useProjectsStore } from '@/features/projects'
import { buildAppBreadcrumbs } from '../model/app-breadcrumbs'

const route = useRoute()
const projectsState = useProjectsStore()
const overviewState = useProjectOverviewStore()
const documentsState = useDocumentsStore()
const projectId = computed(() => projectIdFromPath(route.path))
const projectName = computed(() => {
  if (projectId.value === null) return null

  const listedProject = projectsState.projects.find(project => project.id === projectId.value)
  if (listedProject) return listedProject.name
  return overviewState.project?.id === projectId.value ? overviewState.project.name : null
})
const documentName = computed(() => {
  const documentId = route.path.split('/').filter(Boolean)[3]
  return documentId && documentsState.current?.id === documentId
    ? documentsState.current.title
    : null
})
const items = computed(() => buildAppBreadcrumbs(route.path, projectName.value, documentName.value))
</script>

<template>
  <UiBreadcrumb class="min-w-0">
    <UiBreadcrumbList class="flex-nowrap overflow-hidden">
      <template v-for="(item, index) in items" :key="`${item.to ?? 'current'}:${item.label}`">
        <UiBreadcrumbSeparator v-if="index > 0" />
        <UiBreadcrumbItem class="min-w-0">
          <UiBreadcrumbLink v-if="item.to" as-child>
            <NuxtLink :to="item.to">{{ item.label }}</NuxtLink>
          </UiBreadcrumbLink>
          <UiBreadcrumbPage v-else>{{ item.label }}</UiBreadcrumbPage>
        </UiBreadcrumbItem>
      </template>
    </UiBreadcrumbList>
  </UiBreadcrumb>
</template>
