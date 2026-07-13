<script setup lang="ts">
import { computed } from 'vue'
import { AdministrationTabs, AdministrationUserDetailView } from '@/features/administration'

const route = useRoute()
const userId = computed(() => String(route.params.id))
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="px-4 lg:px-6">
      <AdministrationTabs active="users" />
    </div>
    <AdministrationUserDetailView :user-id="userId" />
  </div>
</template>
