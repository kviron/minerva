<script setup lang="ts">
import { computed } from 'vue'
import { GlobalNavigation, GlobalSettingsNavigation } from '@/features/navigation'
import { CurrentUserMenu } from '@/features/identity'
import { CurrentProjectSidebar, projectIdFromPath } from '@/features/projects'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
} from '@/components/ui/sidebar'

const route = useRoute()
const currentProjectId = computed(() => projectIdFromPath(route.path))
</script>

<template>
  <Sidebar collapsible="icon">
    <SidebarContent>
      <CurrentProjectSidebar />
      <GlobalNavigation v-if="currentProjectId === null" />
      <GlobalSettingsNavigation class="mt-auto" />
    </SidebarContent>
    <SidebarFooter>
      <CurrentUserMenu />
    </SidebarFooter>
  </Sidebar>
</template>
