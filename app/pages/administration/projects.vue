<script setup lang="ts">
import { AdministrationTabs } from '@/features/administration'
import { ProjectsView } from '@/features/projects'
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="px-4 lg:px-6">
      <AdministrationTabs active="projects" />
    </div>
    <ProjectsView scope="administration" />
  </div>
</template>
