<script setup lang="ts">
import { OAuthConsentView } from '@/features/oauth-grants'
import { parseOAuthConsentRequest } from '@/features/oauth-grants/model/consent-request'

definePageMeta({ layout: false })

const route = useRoute()
const request = parseOAuthConsentRequest(route.query)
const oauthQuery = route.fullPath.split('?', 2)[1] ?? ''
</script>

<template>
  <OAuthConsentView :request="request" :oauth-query="oauthQuery" />
</template>
