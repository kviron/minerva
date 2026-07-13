import type { DocumentDraftUpdateCode, DocumentPublicationState, DocumentTemplate } from './constants'

export type DocumentJsonPrimitive = string | number | boolean | null
export type DocumentJsonValue =
  | DocumentJsonPrimitive
  | readonly DocumentJsonValue[]
  | Readonly<{ [key: string]: DocumentJsonValue }>

export interface DocumentContentMark {
  readonly type: string
  readonly attrs?: Readonly<Record<string, DocumentJsonValue>>
}

export interface DocumentContentNode {
  readonly type: string
  readonly attrs?: Readonly<Record<string, DocumentJsonValue>>
  readonly content?: readonly DocumentContentNode[]
  readonly marks?: readonly DocumentContentMark[]
  readonly text?: string
}

export interface DocumentContent {
  readonly type: 'doc'
  readonly content: readonly DocumentContentNode[]
}

export interface RootDocumentListItem {
  readonly id: string
  readonly title: string
  readonly slug: string
  readonly childCount: number
  readonly updatedAt: string
  readonly publicationState: DocumentPublicationState
}

export type RootDocumentsResponse = readonly RootDocumentListItem[]

export interface CreateDocumentRequest {
  readonly title: string
  readonly parentId: string | null
  readonly template: DocumentTemplate
}

export interface CreateDocumentResponse {
  readonly documentId: string
}

export interface DocumentTreeNode {
  readonly id: string
  readonly title: string
  readonly slug: string
  readonly updatedAt: string
  readonly publicationState: DocumentPublicationState
  readonly children: readonly DocumentTreeNode[]
}

export type DocumentTreeResponse = readonly DocumentTreeNode[]

export interface DocumentRelationItem {
  readonly id: string
  readonly title: string
}

export interface DocumentDetailResponse {
  readonly id: string
  readonly title: string
  readonly slug: string
  readonly parentId: string | null
  readonly draftRevision: number
  readonly draftContent: DocumentContent
  readonly publicationState: DocumentPublicationState
  readonly updatedAt: string
  readonly ancestors: readonly DocumentRelationItem[]
  readonly children: readonly DocumentRelationItem[]
}

export interface UpdateDocumentDraftRequest {
  readonly title: string
  readonly content: DocumentContent
  readonly expectedRevision: number
}

export interface UpdateDocumentDraftResponse {
  readonly draftRevision: number
  readonly updatedAt: string
}

export type UpdateDocumentDraftResult =
  | { readonly ok: true, readonly value: UpdateDocumentDraftResponse }
  | { readonly ok: false, readonly code: DocumentDraftUpdateCode }
