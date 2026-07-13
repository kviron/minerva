<script setup lang="ts">
import { CredentialsProvider, CredentialsView } from '@/features/credentials'

const projectId = useRoute().params.id as string
</script>

<template>
  <CredentialsProvider :project-id="projectId">
    <CredentialsView />
  </CredentialsProvider>
</template>
