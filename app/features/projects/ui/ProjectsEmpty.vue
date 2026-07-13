<script setup lang="ts">
import { FolderOpen } from '@lucide/vue'

defineEmits<{ create: [] }>()
</script>

<template>
  <UiEmpty class="border border-dashed">
    <UiEmptyHeader>
      <UiEmptyMedia variant="icon">
        <FolderOpen />
      </UiEmptyMedia>
      <UiEmptyTitle>Проектов пока нет</UiEmptyTitle>
      <UiEmptyDescription>
        Создайте первый проект, чтобы начать работу с документацией.
      </UiEmptyDescription>
    </UiEmptyHeader>
    <UiEmptyContent>
      <UiButton @click="$emit('create')">
        Создать проект
      </UiButton>
    </UiEmptyContent>
  </UiEmpty>
</template>
