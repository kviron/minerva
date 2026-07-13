<script setup lang="ts">
import { ProjectsActions } from '../model/actions/actions'
import { provideProjectsActions } from '../model/actions/provider'

const actions = new ProjectsActions()
provideProjectsActions(actions)
</script>

<template>
  <slot />
</template>
