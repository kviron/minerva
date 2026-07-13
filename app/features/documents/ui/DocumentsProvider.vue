<script setup lang="ts">
import { DocumentsActions } from '../model/actions/actions'
import { provideDocumentsActions } from '../model/actions/provider'

provideDocumentsActions(new DocumentsActions())
</script>

<template>
  <slot />
</template>
