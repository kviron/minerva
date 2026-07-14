import { z } from 'zod'
import type {
  CreateDocumentRequest,
  CreateDocumentResponse,
  ArchiveDocumentResponse,
  ArchivedDocumentsResponse,
  DocumentContent,
  DocumentContentNode,
  DocumentDetailResponse,
  DocumentImageUploadResponse,
  DiscardDocumentResponse,
  DocumentJsonValue,
  DocumentVersionDetail,
  DocumentVersionMutationResult,
  DocumentVersionsResponse,
  DocumentTreeNode,
  DocumentTreeResponse,
  MoveDocumentRequest,
  MoveDocumentResponse,
  PublishDocumentRequest,
  PublishDocumentResponse,
  RestoreDocumentVersionRequest,
  RestoreDocumentVersionResponse,
  RestoreDocumentResponse,
  RootDocumentsResponse,
  UpdateDocumentDraftRequest,
  UpdateDocumentDraftResponse,
  UpdateDocumentDraftResult,
} from '../../../../shared/documents/contracts'
import { DOCUMENT_DRAFT_UPDATE_CODE } from '../../../../shared/documents/constants'

const rootDocumentSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(160),
  childCount: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
  publicationState: z.enum(['draft', 'published']),
}).strict()
const createDocumentResponseSchema = z.object({ documentId: z.string().uuid() }).strict()
const documentJsonValueSchema: z.ZodType<DocumentJsonValue> = z.lazy(() => z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(documentJsonValueSchema),
  z.record(z.string(), documentJsonValueSchema),
]))
const documentMarkSchema = z.object({
  type: z.string().min(1),
  attrs: z.record(z.string(), documentJsonValueSchema).optional(),
}).strict()
const documentContentNodeSchema: z.ZodType<DocumentContentNode> = z.lazy(() => z.object({
  type: z.string().min(1),
  attrs: z.record(z.string(), documentJsonValueSchema).optional(),
  content: z.array(documentContentNodeSchema).optional(),
  marks: z.array(documentMarkSchema).optional(),
  text: z.string().optional(),
}).strict())
const documentContentSchema: z.ZodType<DocumentContent> = z.object({
  type: z.literal('doc'),
  content: z.array(documentContentNodeSchema),
}).strict()
const documentTreeNodeSchema: z.ZodType<DocumentTreeNode> = z.lazy(() => z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(160),
  updatedAt: z.string().datetime(),
  publicationState: z.enum(['draft', 'published']),
  hasPublishedVersions: z.boolean(),
  children: z.array(documentTreeNodeSchema),
}).strict())
const documentTreeResponseSchema: z.ZodType<DocumentTreeResponse> = z.array(documentTreeNodeSchema)
const moveDocumentResponseSchema: z.ZodType<MoveDocumentResponse> = z.object({
  parentId: z.string().uuid().nullable(),
  position: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
}).strict()
const archiveDocumentResponseSchema: z.ZodType<ArchiveDocumentResponse> = z.object({
  archiveBatchId: z.string().uuid(),
  archivedCount: z.number().int().positive(),
  archivedAt: z.string().datetime(),
}).strict()
const discardDocumentResponseSchema: z.ZodType<DiscardDocumentResponse> = z.object({
  deletedCount: z.number().int().positive(),
  deletedAt: z.string().datetime(),
}).strict()
const archivedDocumentBatchSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  originalParentId: z.string().uuid().nullable(),
  pageCount: z.number().int().positive(),
  archivedAt: z.string().datetime(),
  archivedByName: z.string().min(1),
}).strict()
const restoreDocumentResponseSchema: z.ZodType<RestoreDocumentResponse> = z.object({
  restoredCount: z.number().int().positive(),
  restoredAt: z.string().datetime(),
}).strict()
const documentRelationSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
}).strict()
const documentDetailResponseSchema: z.ZodType<DocumentDetailResponse> = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(160),
  parentId: z.string().uuid().nullable(),
  draftRevision: z.number().int().nonnegative(),
  draftContent: documentContentSchema,
  publicationState: z.enum(['draft', 'published']),
  updatedAt: z.string().datetime(),
  ancestors: z.array(documentRelationSchema),
  children: z.array(documentRelationSchema),
  internalLinks: z.array(documentRelationSchema),
  backlinks: z.array(documentRelationSchema),
}).strict()
const documentImageUploadResponseSchema: z.ZodType<DocumentImageUploadResponse> = z.object({
  id: z.string().uuid(),
  filename: z.string().min(1).max(200),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/gif', 'image/webp']),
  byteSize: z.number().int().positive().max(10 * 1024 * 1024),
  url: z.string().startsWith('/api/projects/'),
}).strict()
const updateDocumentDraftResponseSchema: z.ZodType<UpdateDocumentDraftResponse> = z.object({
  draftRevision: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
}).strict()
const publishDocumentResponseSchema: z.ZodType<PublishDocumentResponse> = z.object({
  versionNumber: z.number().int().positive(),
  publishedAt: z.string().datetime(),
}).strict()
const documentVersionSummarySchema = z.object({
  versionNumber: z.number().int().positive(),
  sourceDraftRevision: z.number().int().nonnegative(),
  title: z.string().min(1).max(200),
  changeSummary: z.string().max(1000),
  publishedByName: z.string().min(1),
  publishedAt: z.string().datetime(),
}).strict()
const documentVersionDetailSchema: z.ZodType<DocumentVersionDetail> = documentVersionSummarySchema.extend({
  content: documentContentSchema,
}).strict()
const restoreDocumentVersionResponseSchema: z.ZodType<RestoreDocumentVersionResponse> = z.object({
  draftRevision: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
  title: z.string().min(1).max(200),
  content: documentContentSchema,
}).strict()

export const parseDocumentTreeResponse = (value: unknown): DocumentTreeResponse => {
  const parsed = documentTreeResponseSchema.safeParse(value)
  if (!parsed.success) {
    throw new Error('Invalid document tree response')
  }
  return parsed.data
}

export const parseDocumentDetailResponse = (value: unknown): DocumentDetailResponse => {
  const parsed = documentDetailResponseSchema.safeParse(value)
  if (!parsed.success) {
    throw new Error('Invalid document detail response')
  }
  return parsed.data
}

export const parseEditorDocumentContent = (value: unknown): DocumentContent => {
  const parsed = documentContentSchema.safeParse(value)
  if (!parsed.success) {
    throw new Error('Invalid editor document content')
  }
  return parsed.data
}

const isDraftConflictError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null || !('data' in error)) {
    return false
  }
  const payload = error.data
  if (typeof payload !== 'object' || payload === null || !('data' in payload)) {
    return false
  }
  const data = payload.data
  return typeof data === 'object'
    && data !== null
    && 'code' in data
    && data.code === DOCUMENT_DRAFT_UPDATE_CODE.DRAFT_CONFLICT
}

export const parseRootDocumentsResponse = (value: unknown): RootDocumentsResponse => {
  const parsed = z.array(rootDocumentSchema).safeParse(value)
  if (!parsed.success) {
    throw new Error('Invalid root documents response')
  }
  return parsed.data
}

export const documentsApi = {
  async uploadImage(projectId: string, file: File, signal?: AbortSignal): Promise<DocumentImageUploadResponse> {
    const form = new FormData()
    form.append('file', file)
    const response = await $fetch(`/api/projects/${projectId}/documents/images`, { method: 'POST', body: form, signal })
    const parsed = documentImageUploadResponseSchema.safeParse(response)
    if (!parsed.success) throw new Error('Invalid document image upload response')
    return parsed.data
  },
  async listRoots(projectId: string, signal?: AbortSignal): Promise<RootDocumentsResponse> {
    return parseRootDocumentsResponse(await $fetch(`/api/projects/${projectId}/documents`, { signal }))
  },
  async create(projectId: string, input: CreateDocumentRequest, signal?: AbortSignal): Promise<CreateDocumentResponse> {
    const response = await $fetch(`/api/projects/${projectId}/documents`, { method: 'POST', body: input, signal })
    const parsed = createDocumentResponseSchema.safeParse(response)
    if (!parsed.success) {
      throw new Error('Invalid create document response')
    }
    return parsed.data
  },
  async listTree(projectId: string, signal?: AbortSignal): Promise<DocumentTreeResponse> {
    return parseDocumentTreeResponse(await $fetch(`/api/projects/${projectId}/documents/tree`, { signal }))
  },
  async get(projectId: string, documentId: string, signal?: AbortSignal): Promise<DocumentDetailResponse> {
    return parseDocumentDetailResponse(await $fetch(`/api/projects/${projectId}/documents/${documentId}`, { signal }))
  },
  async move(
    projectId: string,
    documentId: string,
    input: MoveDocumentRequest,
    signal?: AbortSignal,
  ): Promise<MoveDocumentResponse> {
    const response = await $fetch(`/api/projects/${projectId}/documents/${documentId}/move`, {
      method: 'PATCH',
      body: input,
      signal,
    })
    const parsed = moveDocumentResponseSchema.safeParse(response)
    if (!parsed.success) {
      throw new Error('Invalid move document response')
    }
    return parsed.data
  },
  async archive(projectId: string, documentId: string, signal?: AbortSignal): Promise<ArchiveDocumentResponse> {
    const url: string = `/api/projects/${projectId}/documents/${documentId}`
    const response = await $fetch(url, { method: 'DELETE', signal })
    const parsed = archiveDocumentResponseSchema.safeParse(response)
    if (!parsed.success) throw new Error('Invalid archive document response')
    return parsed.data
  },
  async discard(projectId: string, documentId: string, signal?: AbortSignal): Promise<DiscardDocumentResponse> {
    const response = await $fetch(`/api/projects/${projectId}/documents/${documentId}/discard`, {
      method: 'DELETE',
      signal,
    })
    const parsed = discardDocumentResponseSchema.safeParse(response)
    if (!parsed.success) throw new Error('Invalid discard document response')
    return parsed.data
  },
  async listArchive(projectId: string, signal?: AbortSignal): Promise<ArchivedDocumentsResponse> {
    const response = await $fetch(`/api/projects/${projectId}/documents/archive`, { signal })
    const parsed = z.array(archivedDocumentBatchSchema).safeParse(response)
    if (!parsed.success) throw new Error('Invalid archived documents response')
    return parsed.data
  },
  async restore(projectId: string, documentId: string, signal?: AbortSignal): Promise<RestoreDocumentResponse> {
    const response = await $fetch(`/api/projects/${projectId}/documents/${documentId}/restore`, { method: 'POST', signal })
    const parsed = restoreDocumentResponseSchema.safeParse(response)
    if (!parsed.success) throw new Error('Invalid restore document response')
    return parsed.data
  },
  async updateDraft(
    projectId: string,
    documentId: string,
    input: UpdateDocumentDraftRequest,
    signal?: AbortSignal,
  ): Promise<UpdateDocumentDraftResult> {
    try {
      const response = await $fetch(`/api/projects/${projectId}/documents/${documentId}/draft`, {
        method: 'PATCH',
        body: input,
        signal,
      })
      const parsed = updateDocumentDraftResponseSchema.safeParse(response)
      if (!parsed.success) {
        throw new Error('Invalid update document draft response')
      }
      return { ok: true, value: parsed.data }
    }
    catch (error: unknown) {
      if (isDraftConflictError(error)) {
        return { ok: false, code: DOCUMENT_DRAFT_UPDATE_CODE.DRAFT_CONFLICT }
      }
      throw error
    }
  },
  async publish(
    projectId: string,
    documentId: string,
    input: PublishDocumentRequest,
    signal?: AbortSignal,
  ): Promise<DocumentVersionMutationResult<PublishDocumentResponse>> {
    try {
      const response = await $fetch(`/api/projects/${projectId}/documents/${documentId}/publish`, {
        method: 'POST', body: input, signal,
      })
      const parsed = publishDocumentResponseSchema.safeParse(response)
      if (!parsed.success) throw new Error('Invalid publish document response')
      return { ok: true, value: parsed.data }
    }
    catch (error: unknown) {
      if (isDraftConflictError(error)) return { ok: false, code: DOCUMENT_DRAFT_UPDATE_CODE.DRAFT_CONFLICT }
      throw error
    }
  },
  async listVersions(projectId: string, documentId: string, signal?: AbortSignal): Promise<DocumentVersionsResponse> {
    const response = await $fetch(`/api/projects/${projectId}/documents/${documentId}/versions`, { signal })
    const parsed = z.array(documentVersionSummarySchema).safeParse(response)
    if (!parsed.success) throw new Error('Invalid document versions response')
    return parsed.data
  },
  async getVersion(
    projectId: string,
    documentId: string,
    versionNumber: number,
    signal?: AbortSignal,
  ): Promise<DocumentVersionDetail> {
    const response = await $fetch(`/api/projects/${projectId}/documents/${documentId}/versions/${versionNumber}`, { signal })
    const parsed = documentVersionDetailSchema.safeParse(response)
    if (!parsed.success) throw new Error('Invalid document version response')
    return parsed.data
  },
  async restoreVersion(
    projectId: string,
    documentId: string,
    versionNumber: number,
    input: RestoreDocumentVersionRequest,
    signal?: AbortSignal,
  ): Promise<DocumentVersionMutationResult<RestoreDocumentVersionResponse>> {
    try {
      const response = await $fetch(`/api/projects/${projectId}/documents/${documentId}/versions/${versionNumber}/restore`, {
        method: 'POST', body: input, signal,
      })
      const parsed = restoreDocumentVersionResponseSchema.safeParse(response)
      if (!parsed.success) throw new Error('Invalid restore document version response')
      return { ok: true, value: parsed.data }
    }
    catch (error: unknown) {
      if (isDraftConflictError(error)) return { ok: false, code: DOCUMENT_DRAFT_UPDATE_CODE.DRAFT_CONFLICT }
      throw error
    }
  },
}
