<script setup lang="ts">
import ModeToggle from '@/components/modeToggle/index.vue'
import { AppBreadcrumbs } from '@/features/navigation'
</script>

<template>
  <header class="flex h-header shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-header">
    <div class="flex min-w-0 w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
      <UiSidebarTrigger class="-ml-1" />
      <UiSeparator orientation="vertical" class="mr-2 data-[orientation=vertical]:h-4" />
      <AppBreadcrumbs />
      <div class="ml-auto flex items-center gap-2">
        <ModeToggle />
      </div>
    </div>
  </header>
</template>
