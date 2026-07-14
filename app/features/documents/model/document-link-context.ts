import type { ComputedRef, InjectionKey } from 'vue'
import type { DocumentRelationItem } from '../../../../shared/documents/contracts'

export interface DocumentLinkContext {
  readonly projectId: string
  readonly targets: ReadonlyMap<string, DocumentRelationItem>
}

export const DOCUMENT_LINK_CONTEXT: InjectionKey<ComputedRef<DocumentLinkContext>> = Symbol('document-link-context')
