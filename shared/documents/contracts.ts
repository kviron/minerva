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
  readonly hasPublishedVersions: boolean
  readonly children: readonly DocumentTreeNode[]
}

export type DocumentTreeResponse = readonly DocumentTreeNode[]

export interface MoveDocumentRequest {
  readonly targetParentId: string | null
  readonly targetPosition: number
}

export interface MoveDocumentResponse {
  readonly parentId: string | null
  readonly position: number
  readonly updatedAt: string
}

export interface ArchiveDocumentResponse {
  readonly archiveBatchId: string
  readonly archivedCount: number
  readonly archivedAt: string
}

export interface DiscardDocumentResponse {
  readonly deletedCount: number
  readonly deletedAt: string
}

export interface ArchivedDocumentBatch {
  readonly id: string
  readonly title: string
  readonly originalParentId: string | null
  readonly pageCount: number
  readonly archivedAt: string
  readonly archivedByName: string
}

export type ArchivedDocumentsResponse = readonly ArchivedDocumentBatch[]

export interface RestoreDocumentResponse {
  readonly restoredCount: number
  readonly restoredAt: string
}

export interface DocumentRelationItem {
  readonly id: string
  readonly title: string
}

export interface DocumentImageUploadResponse {
  readonly id: string
  readonly filename: string
  readonly mimeType: string
  readonly byteSize: number
  readonly url: string
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
  readonly internalLinks: readonly DocumentRelationItem[]
  readonly backlinks: readonly DocumentRelationItem[]
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

export interface PublishDocumentRequest {
  readonly changeSummary?: string
  readonly expectedRevision: number
}

export interface PublishDocumentResponse {
  readonly versionNumber: number
  readonly publishedAt: string
}

export interface DocumentVersionSummary {
  readonly versionNumber: number
  readonly sourceDraftRevision: number
  readonly title: string
  readonly changeSummary: string
  readonly publishedByName: string
  readonly publishedAt: string
}

export type DocumentVersionsResponse = readonly DocumentVersionSummary[]

export interface DocumentVersionDetail extends DocumentVersionSummary {
  readonly content: DocumentContent
}

export interface RestoreDocumentVersionRequest {
  readonly expectedRevision: number
}

export interface RestoreDocumentVersionResponse {
  readonly draftRevision: number
  readonly updatedAt: string
  readonly title: string
  readonly content: DocumentContent
}

export type DocumentVersionMutationResult<T> =
  | { readonly ok: true, readonly value: T }
  | { readonly ok: false, readonly code: DocumentDraftUpdateCode }
