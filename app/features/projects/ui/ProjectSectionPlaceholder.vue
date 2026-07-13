<script setup lang="ts">
import { Construction } from '@lucide/vue'

defineProps<{
  title: string
  description: string
}>()
</script>

<template>
  <UiEmpty class="border border-dashed">
    <UiEmptyHeader>
      <UiEmptyMedia variant="icon">
        <Construction />
      </UiEmptyMedia>
      <UiEmptyTitle>{{ title }}</UiEmptyTitle>
      <UiEmptyDescription>{{ description }}</UiEmptyDescription>
    </UiEmptyHeader>
  </UiEmpty>
</template>
