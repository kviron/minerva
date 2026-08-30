import { defineStore } from 'pinia'
import type {
  DocumentDetailResponse,
  DocumentSearchResultItem,
  ArchivedDocumentBatch,
  DocumentTreeNode,
  DocumentVersionDetail,
  DocumentVersionSummary,
  RootDocumentListItem,
} from '../../../../shared/documents/contracts'

interface DocumentsState {
  roots: RootDocumentListItem[]
  tree: DocumentTreeNode[]
  current: DocumentDetailResponse | null
  versions: DocumentVersionSummary[]
  selectedVersion: DocumentVersionDetail | null
  archive: ArchivedDocumentBatch[]
  searchResults: DocumentSearchResultItem[]
}

export const useDocumentsStore = defineStore('documents', {
  state: (): DocumentsState => ({
    roots: [],
    tree: [],
    current: null,
    versions: [],
    selectedVersion: null,
    archive: [],
    searchResults: [],
  }),

  actions: {
    applyRoots(roots: readonly RootDocumentListItem[]): void {
      this.roots = [...roots]
    },

    clearRoots(): void {
      this.roots = []
    },

    applySearchResults(results: readonly DocumentSearchResultItem[]): void {
      this.searchResults = results.map(result => ({ ...result }))
    },

    clearSearchResults(): void {
      this.searchResults = []
    },

    applyArchive(archive: readonly ArchivedDocumentBatch[]): void {
      this.archive = [...archive]
    },

    clearArchive(): void {
      this.archive = []
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
            internalLinks: [...document.internalLinks],
            backlinks: [...document.backlinks],
          }
    },

    applyVersions(versions: readonly DocumentVersionSummary[]): void {
      this.versions = [...versions]
    },

    applySelectedVersion(version: DocumentVersionDetail | null): void {
      this.selectedVersion = version === null ? null : { ...version }
    },

    clearVersions(): void {
      this.versions = []
      this.selectedVersion = null
    },

    clearReader(): void {
      this.tree = []
      this.current = null
      this.versions = []
      this.selectedVersion = null
    },
  },
})
