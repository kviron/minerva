<script setup lang="ts">
import type { PublicDocumentTreeNode } from '../../../../shared/documents/public-share-contracts'
import { publicDocumentRoute } from '../model/public-documentation-links'

defineOptions({ name: 'PublicDocumentTree' })
defineProps<{ nodes: readonly PublicDocumentTreeNode[], token: string, currentId: string }>()
</script>

<template>
  <ul class="space-y-0.5">
    <li v-for="node in nodes" :key="node.id">
      <NuxtLink
        :to="publicDocumentRoute(token, node.id)"
        class="block truncate rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
        :class="node.id === currentId ? 'bg-accent font-medium text-accent-foreground' : 'text-muted-foreground'"
      >{{ node.title }}</NuxtLink>
      <PublicDocumentTree v-if="node.children.length" :nodes="node.children" :token="token" :current-id="currentId" class="ml-3 border-l pl-2" />
    </li>
  </ul>
</template>
