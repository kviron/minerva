<script setup lang="ts">
import { SearchX } from '@lucide/vue'
</script>

<template>
  <UiEmpty class="border border-dashed">
    <UiEmptyHeader>
      <UiEmptyMedia variant="icon">
        <SearchX />
      </UiEmptyMedia>
      <UiEmptyTitle>Проекты не найдены</UiEmptyTitle>
      <UiEmptyDescription>
        В этом статусе пока нет проектов. Выберите другой фильтр.
      </UiEmptyDescription>
    </UiEmptyHeader>
  </UiEmpty>
</template>
