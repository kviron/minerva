import { z } from 'zod'
import { DOCUMENT_DRAFT_UPDATE_CODE, DOCUMENT_PUBLICATION_STATE } from './constants'
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

export interface DocumentSearchRequest {
  readonly query: string
}

export interface DocumentSearchResultItem {
  readonly id: string
  readonly title: string
  readonly excerpt: string
  readonly updatedAt: string
  readonly publicationState: DocumentPublicationState
}

export type DocumentSearchResponse = readonly DocumentSearchResultItem[]

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

const publicationStateSchema = z.nativeEnum(DOCUMENT_PUBLICATION_STATE)

export const rootDocumentSchema: z.ZodType<RootDocumentListItem> = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(160),
  childCount: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
  publicationState: publicationStateSchema,
}).strict().readonly()

export const rootDocumentsResponseSchema: z.ZodType<RootDocumentsResponse> = z.array(rootDocumentSchema).readonly()

export const createDocumentResponseSchema: z.ZodType<CreateDocumentResponse> = z.object({
  documentId: z.string().uuid(),
}).strict().readonly()

export const documentSearchResultSchema: z.ZodType<DocumentSearchResultItem> = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  excerpt: z.string().max(180),
  updatedAt: z.string().datetime(),
  publicationState: publicationStateSchema,
}).strict().readonly()

export const documentSearchResponseSchema: z.ZodType<DocumentSearchResponse> = z.array(documentSearchResultSchema).readonly()

export const documentJsonValueSchema: z.ZodType<DocumentJsonValue> = z.lazy(() => z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(documentJsonValueSchema),
  z.record(z.string(), documentJsonValueSchema),
]))

export const documentMarkSchema: z.ZodType<DocumentContentMark> = z.object({
  type: z.string().min(1),
  attrs: z.record(z.string(), documentJsonValueSchema).optional(),
}).strict().readonly()

export const documentContentNodeSchema: z.ZodType<DocumentContentNode> = z.lazy(() => z.object({
  type: z.string().min(1),
  attrs: z.record(z.string(), documentJsonValueSchema).optional(),
  content: z.array(documentContentNodeSchema).optional(),
  marks: z.array(documentMarkSchema).optional(),
  text: z.string().optional(),
}).strict().readonly())

export const documentContentSchema: z.ZodType<DocumentContent> = z.object({
  type: z.literal('doc'),
  content: z.array(documentContentNodeSchema),
}).strict().readonly()

export const documentTreeNodeSchema: z.ZodType<DocumentTreeNode> = z.lazy(() => z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(160),
  updatedAt: z.string().datetime(),
  publicationState: publicationStateSchema,
  hasPublishedVersions: z.boolean(),
  children: z.array(documentTreeNodeSchema),
}).strict().readonly())

export const documentTreeResponseSchema: z.ZodType<DocumentTreeResponse> = z.array(documentTreeNodeSchema).readonly()

export const moveDocumentResponseSchema: z.ZodType<MoveDocumentResponse> = z.object({
  parentId: z.string().uuid().nullable(),
  position: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
}).strict().readonly()

export const archiveDocumentResponseSchema: z.ZodType<ArchiveDocumentResponse> = z.object({
  archiveBatchId: z.string().uuid(),
  archivedCount: z.number().int().positive(),
  archivedAt: z.string().datetime(),
}).strict().readonly()

export const discardDocumentResponseSchema: z.ZodType<DiscardDocumentResponse> = z.object({
  deletedCount: z.number().int().positive(),
  deletedAt: z.string().datetime(),
}).strict().readonly()

export const archivedDocumentBatchSchema: z.ZodType<ArchivedDocumentBatch> = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  originalParentId: z.string().uuid().nullable(),
  pageCount: z.number().int().positive(),
  archivedAt: z.string().datetime(),
  archivedByName: z.string().min(1),
}).strict().readonly()

export const archivedDocumentsResponseSchema: z.ZodType<ArchivedDocumentsResponse> = z.array(archivedDocumentBatchSchema).readonly()

export const restoreDocumentResponseSchema: z.ZodType<RestoreDocumentResponse> = z.object({
  restoredCount: z.number().int().positive(),
  restoredAt: z.string().datetime(),
}).strict().readonly()

export const documentRelationSchema: z.ZodType<DocumentRelationItem> = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
}).strict().readonly()

export const documentDetailResponseSchema: z.ZodType<DocumentDetailResponse> = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(160),
  parentId: z.string().uuid().nullable(),
  draftRevision: z.number().int().nonnegative(),
  draftContent: documentContentSchema,
  publicationState: publicationStateSchema,
  updatedAt: z.string().datetime(),
  ancestors: z.array(documentRelationSchema),
  children: z.array(documentRelationSchema),
  internalLinks: z.array(documentRelationSchema),
  backlinks: z.array(documentRelationSchema),
}).strict().readonly()

export const documentImageUploadResponseSchema: z.ZodType<DocumentImageUploadResponse> = z.object({
  id: z.string().uuid(),
  filename: z.string().min(1).max(200),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/gif', 'image/webp']),
  byteSize: z.number().int().positive().max(10 * 1024 * 1024),
  url: z.string().startsWith('/api/projects/'),
}).strict().readonly()

export const updateDocumentDraftResponseSchema: z.ZodType<UpdateDocumentDraftResponse> = z.object({
  draftRevision: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
}).strict().readonly()

export const publishDocumentResponseSchema: z.ZodType<PublishDocumentResponse> = z.object({
  versionNumber: z.number().int().positive(),
  publishedAt: z.string().datetime(),
}).strict().readonly()

const documentVersionSummaryBaseSchema = z.object({
  versionNumber: z.number().int().positive(),
  sourceDraftRevision: z.number().int().nonnegative(),
  title: z.string().min(1).max(200),
  changeSummary: z.string().max(1000),
  publishedByName: z.string().min(1),
  publishedAt: z.string().datetime(),
}).strict()

export const documentVersionSummarySchema: z.ZodType<DocumentVersionSummary> = documentVersionSummaryBaseSchema.readonly()
export const documentVersionsResponseSchema: z.ZodType<DocumentVersionsResponse> = z.array(documentVersionSummarySchema).readonly()

export const documentVersionDetailSchema: z.ZodType<DocumentVersionDetail> = documentVersionSummaryBaseSchema.extend({
  content: documentContentSchema,
}).strict().readonly()

export const restoreDocumentVersionResponseSchema: z.ZodType<RestoreDocumentVersionResponse> = z.object({
  draftRevision: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
  title: z.string().min(1).max(200),
  content: documentContentSchema,
}).strict().readonly()

export const documentDraftUpdateErrorResponseSchema = z.object({
  data: z.object({
    code: z.nativeEnum(DOCUMENT_DRAFT_UPDATE_CODE),
  }).strict().readonly(),
}).strict().readonly()
