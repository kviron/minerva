<script setup lang="ts">

</script>

<template>
  <UiSidebarProvider>
    <AppSidebar variant="inset" />
    <UiSidebarInset>
      <AppHeader />
      <div class="flex flex-1 flex-col">
        <div class="@container/main flex flex-1 flex-col gap-2">
          <div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <slot />
          </div>
        </div>
      </div>
    </UiSidebarInset>
  </UiSidebarProvider>
</template>
