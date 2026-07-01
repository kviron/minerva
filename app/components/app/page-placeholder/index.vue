<script setup lang="ts">
import { Construction } from '@lucide/vue'

withDefaults(
  defineProps<{
    title?: string
    description?: string
  }>(),
  {
    title: 'Страница в разработке',
    description: 'Этот раздел пока недоступен. Мы работаем над ним.',
  },
)
</script>

<template>
  <section class="flex min-h-64 w-full flex-col items-center justify-center gap-4 px-4 py-16 text-center">
    <Construction
      aria-hidden="true"
      class="text-muted-foreground size-12"
    />
    <div class="max-w-md space-y-2">
      <h1 class="text-2xl font-semibold tracking-tight">
        {{ title }}
      </h1>
      <p class="text-muted-foreground text-sm text-pretty">
        {{ description }}
      </p>
    </div>
  </section>
</template>
