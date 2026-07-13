<script setup lang="ts">
import type { SettingsTab } from '../model/settings-tabs'
import SettingsTabs from './SettingsTabs.vue'

defineProps<{ active: SettingsTab }>()
</script>

<template>
  <header class="flex flex-col gap-4 px-4 lg:px-6">
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl font-semibold">Настройки</h1>
      <p class="text-sm text-muted-foreground">
        Управляйте профилем, безопасностью и подключениями приложения.
      </p>
    </div>
    <SettingsTabs :active="active" />
  </header>
</template>
