import { defineStore } from 'pinia'
import type { PublicDocumentationResponse } from '../../../../shared/documents/public-share-contracts'

interface PublicDocumentationState {
  documentation: PublicDocumentationResponse | null
}

export const usePublicDocumentationStore = defineStore('public-documentation', {
  state: (): PublicDocumentationState => ({ documentation: null }),
  actions: {
    apply(documentation: PublicDocumentationResponse): void {
      this.documentation = documentation
    },
    clear(): void {
      this.documentation = null
    },
  },
})
