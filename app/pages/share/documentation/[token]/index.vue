<script setup lang="ts">
import PublicDocumentationView from '@/features/public-documentation/ui/PublicDocumentationView.vue'

definePageMeta({ layout: 'public-documentation' })
const route = useRoute()
const token = computed(() => typeof route.params.token === 'string' ? route.params.token : '')
</script>
<template><PublicDocumentationView :token="token" /></template>
