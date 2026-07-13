<script setup lang="ts">
import { Settings } from '@lucide/vue'
import { GLOBAL_NAVIGATION } from '../../../../shared/navigation/constants'

const route = useRoute()
</script>

<template>
  <UiSidebarGroup>
    <UiSidebarGroupContent>
      <UiSidebarMenu>
        <UiSidebarMenuItem>
          <UiSidebarMenuButton as-child :is-active="route.path.startsWith('/settings')">
            <NuxtLink :to="GLOBAL_NAVIGATION.SETTINGS.to">
              <Settings aria-hidden="true" />
              <span>Настройки</span>
            </NuxtLink>
          </UiSidebarMenuButton>
        </UiSidebarMenuItem>
      </UiSidebarMenu>
    </UiSidebarGroupContent>
  </UiSidebarGroup>
</template>
