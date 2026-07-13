<script setup lang="ts">
import type { ProjectPermission } from '../../../../shared/projects/types'
import type { ProjectSection } from '../model/project-sections'
import { availableProjectSections, projectSectionPath } from '../model/project-sections'

const props = defineProps<{
  projectId: string
  active: ProjectSection
  permissions: readonly ProjectPermission[]
}>()
</script>

<template>
  <UiTabs :model-value="active">
    <div class="max-w-full overflow-x-auto overflow-y-hidden">
      <UiTabsList>
        <UiTabsTrigger
          v-for="section in availableProjectSections(permissions)"
          :key="section.value"
          :value="section.value"
          as-child
        >
          <NuxtLink :to="projectSectionPath(projectId, section.value)">
            {{ section.label }}
          </NuxtLink>
        </UiTabsTrigger>
      </UiTabsList>
    </div>
  </UiTabs>
</template>
