<script setup lang="ts">
import type { SettingsTab } from '../model/settings-tabs'
import { SETTINGS_TABS } from '../model/settings-tabs'

defineProps<{ active: SettingsTab }>()
</script>

<template>
  <UiTabs :model-value="active">
    <div class="max-w-full overflow-x-auto overflow-y-hidden">
      <UiTabsList>
        <UiTabsTrigger v-for="tab in SETTINGS_TABS" :key="tab.value" :value="tab.value" as-child>
          <NuxtLink :to="tab.to">
            {{ tab.label }}
          </NuxtLink>
        </UiTabsTrigger>
      </UiTabsList>
    </div>
  </UiTabs>
</template>
