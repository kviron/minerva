import { z } from 'zod'
import type {
  CreateDocumentRequest,
  CreateDocumentResponse,
  DocumentContent,
  DocumentContentNode,
  DocumentDetailResponse,
  DocumentJsonValue,
  DocumentTreeNode,
  DocumentTreeResponse,
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
  children: z.array(documentTreeNodeSchema),
}).strict())
const documentTreeResponseSchema: z.ZodType<DocumentTreeResponse> = z.array(documentTreeNodeSchema)
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
}).strict()
const updateDocumentDraftResponseSchema: z.ZodType<UpdateDocumentDraftResponse> = z.object({
  draftRevision: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
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
}
