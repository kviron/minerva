<script setup lang="ts">
import { CredentialsActions } from '../model/actions/actions'
import { CredentialCategoryActions } from '../model/actions/category-actions'
import { provideCredentialCategoryActions, provideCredentialsActions } from '../model/actions/provider'

const props = defineProps<{ projectId: string }>()
const categoryActions = new CredentialCategoryActions(props.projectId)
const credentialsActions = new CredentialsActions(props.projectId)
provideCredentialCategoryActions(categoryActions)
provideCredentialsActions(credentialsActions)
</script>

<template>
  <slot />
</template>
