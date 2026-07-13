import { defineStore } from 'pinia'
import type {
  DocumentDetailResponse,
  DocumentTreeNode,
  RootDocumentListItem,
} from '../../../../shared/documents/contracts'

interface DocumentsState {
  roots: RootDocumentListItem[]
  tree: DocumentTreeNode[]
  current: DocumentDetailResponse | null
}

export const useDocumentsStore = defineStore('documents', {
  state: (): DocumentsState => ({
    roots: [],
    tree: [],
    current: null,
  }),

  actions: {
    applyRoots(roots: readonly RootDocumentListItem[]): void {
      this.roots = [...roots]
    },

    clearRoots(): void {
      this.roots = []
    },

    applyTree(tree: readonly DocumentTreeNode[]): void {
      this.tree = [...tree]
    },

    applyCurrent(document: DocumentDetailResponse | null): void {
      this.current = document === null
        ? null
        : {
            ...document,
            ancestors: [...document.ancestors],
            children: [...document.children],
          }
    },

    clearReader(): void {
      this.tree = []
      this.current = null
    },
  },
})
