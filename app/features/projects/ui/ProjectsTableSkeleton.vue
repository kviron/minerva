<template>
  <div class="overflow-hidden rounded-lg border p-4">
    <div class="flex flex-col gap-4">
      <UiSkeleton class="h-8 w-full" />
      <UiSkeleton v-for="row in 4" :key="row" class="h-12 w-full" />
    </div>
  </div>
</template>
