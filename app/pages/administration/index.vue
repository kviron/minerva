<script setup lang="ts">
import { AdministrationTabs, AdministrationUsersView } from '@/features/administration'
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="px-4 lg:px-6">
      <AdministrationTabs active="users" />
    </div>
    <AdministrationUsersView />
  </div>
</template>
