<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Button } from '@/components/ui/button'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from '@/components/ui/sidebar'
import { globalNavigationApi } from '../api/global-navigation-api'
import { resolveNavigationIcon } from '../model/icon-registry'
import { translateNavigationLabel } from '../model/labels'
import {
  createGlobalNavigationState,
  isGlobalNavigationItemActive,
} from '../model/navigation-state'

const route = useRoute()
const navigation = createGlobalNavigationState(globalNavigationApi.load)
const initialLoadPending = ref(true)
const mainItems = computed(() => navigation.items.value.filter(item => item.id !== 'settings'))

onMounted(() => {
  void navigation.load().finally(() => {
    initialLoadPending.value = false
  })
})
</script>

<template>
  <SidebarMenu>
    <template v-if="initialLoadPending || navigation.pending.value">
      <SidebarMenuItem v-for="index in 3" :key="index">
        <SidebarMenuSkeleton show-icon />
      </SidebarMenuItem>
    </template>
    <SidebarMenuItem v-else-if="navigation.error.value" class="px-2">
      <p role="alert" class="mb-2 text-xs text-muted-foreground">
        {{ navigation.error.value }}
      </p>
      <Button size="sm" variant="outline" @click="navigation.load">
        Повторить
      </Button>
    </SidebarMenuItem>
    <template v-else>
      <SidebarMenuItem v-for="item in mainItems" :key="item.id">
        <SidebarMenuButton
          as-child
          :is-active="isGlobalNavigationItemActive(item, route.path)"
        >
          <NuxtLink :to="item.to">
            <component :is="resolveNavigationIcon(item.icon)" aria-hidden="true" />
            <span>{{ translateNavigationLabel(item.labelKey) }}</span>
          </NuxtLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </template>
  </SidebarMenu>
</template>
