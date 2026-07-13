<script setup lang="ts">
import { Users } from '@lucide/vue'
</script>

<template>
  <UiEmpty class="border border-dashed">
    <UiEmptyHeader>
      <UiEmptyMedia variant="icon">
        <Users aria-hidden="true" />
      </UiEmptyMedia>
      <UiEmptyTitle>Пользователей пока нет</UiEmptyTitle>
      <UiEmptyDescription>
        Пользователи появятся здесь после принятия приглашения.
      </UiEmptyDescription>
    </UiEmptyHeader>
  </UiEmpty>
</template>
