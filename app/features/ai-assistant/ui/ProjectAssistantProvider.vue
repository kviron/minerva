<script setup lang="ts">
import { ProjectAssistantActions } from '../model/actions/assistant-actions'
import { provideProjectAssistantActions } from '../model/actions/assistant-provider'

const actions = new ProjectAssistantActions()
provideProjectAssistantActions(actions)
</script>

<template>
  <slot />
</template>
