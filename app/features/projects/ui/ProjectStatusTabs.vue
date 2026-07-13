<script setup lang="ts">
import type { ProjectStatusFilter } from '../model/project-status-filter'
import { isProjectStatusFilter, PROJECT_STATUS_FILTERS } from '../model/project-status-filter'

defineProps<{
  modelValue: ProjectStatusFilter
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ProjectStatusFilter]
}>()

const selectFilter = (value: string | number) => {
  if (isProjectStatusFilter(value))
    emit('update:modelValue', value)
}
</script>

<template>
  <UiTabs :model-value="modelValue" @update:model-value="selectFilter">
    <div class="max-w-full overflow-x-auto overflow-y-hidden">
      <UiTabsList>
        <UiTabsTrigger
          v-for="filter in PROJECT_STATUS_FILTERS"
          :key="filter.value"
          :value="filter.value"
          :disabled="disabled"
        >
          {{ filter.label }}
        </UiTabsTrigger>
      </UiTabsList>
    </div>
  </UiTabs>
</template>
