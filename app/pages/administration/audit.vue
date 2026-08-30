<script setup lang="ts">
import { AdministrationAuditView, AdministrationTabs } from '@/features/administration'
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="px-4 lg:px-6">
      <AdministrationTabs active="audit" />
    </div>
    <AdministrationAuditView />
  </div>
</template>
