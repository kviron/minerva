<script setup lang="ts">
import { SettingsHeader } from '@/features/settings'
import { OAuthConnectionsView } from '@/features/oauth-grants'
</script>

<template>
  <div class="flex flex-col gap-6">
    <SettingsHeader active="connections" />
    <OAuthConnectionsView />
  </div>
</template>
