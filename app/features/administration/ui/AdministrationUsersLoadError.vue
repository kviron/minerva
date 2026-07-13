<script setup lang="ts">
import { RefreshCcw, TriangleAlert } from '@lucide/vue'

defineProps<{ message: string }>()
const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <UiEmpty role="alert" class="border border-dashed">
    <UiEmptyHeader>
      <UiEmptyMedia variant="icon">
        <TriangleAlert aria-hidden="true" />
      </UiEmptyMedia>
      <UiEmptyTitle>Пользователи не загрузились</UiEmptyTitle>
      <UiEmptyDescription>{{ message }}</UiEmptyDescription>
    </UiEmptyHeader>
    <UiEmptyContent>
      <UiButton variant="outline" @click="emit('retry')">
        <RefreshCcw data-icon="inline-start" />
        Обновить
      </UiButton>
    </UiEmptyContent>
  </UiEmpty>
</template>
