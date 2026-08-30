import type {
  ArchiveDocumentResponse,
  ArchivedDocumentsResponse,
  CreateDocumentRequest,
  CreateDocumentResponse,
  DiscardDocumentResponse,
  DocumentDetailResponse,
  DocumentImageUploadResponse,
  DocumentSearchRequest,
  DocumentSearchResponse,
  DocumentTreeResponse,
  DocumentVersionDetail,
  DocumentVersionMutationResult,
  DocumentVersionsResponse,
  MoveDocumentRequest,
  MoveDocumentResponse,
  PublishDocumentRequest,
  PublishDocumentResponse,
  RestoreDocumentResponse,
  RestoreDocumentVersionRequest,
  RestoreDocumentVersionResponse,
  RootDocumentsResponse,
  UpdateDocumentDraftRequest,
  UpdateDocumentDraftResponse,
  UpdateDocumentDraftResult,
} from '../../../../shared/documents/contracts'
import {
  archiveDocumentResponseSchema,
  archivedDocumentsResponseSchema,
  createDocumentResponseSchema,
  discardDocumentResponseSchema,
  documentDetailResponseSchema,
  documentImageUploadResponseSchema,
  documentSearchResponseSchema,
  documentTreeResponseSchema,
  documentVersionDetailSchema,
  documentVersionsResponseSchema,
  moveDocumentResponseSchema,
  publishDocumentResponseSchema,
  restoreDocumentResponseSchema,
  restoreDocumentVersionResponseSchema,
  rootDocumentsResponseSchema,
  updateDocumentDraftResponseSchema,
} from '../../../../shared/documents/contracts'
import { DOCUMENT_DRAFT_UPDATE_CODE } from '../../../../shared/documents/constants'
import type {
  DocumentPublicShareCreateRequest,
  DocumentPublicShareListResponse,
  DocumentPublicShareMutationResponse,
  DocumentPublicShareProjection,
} from '../../../../shared/documents/public-share-contracts'
import {
  documentPublicShareListResponseSchema,
  documentPublicShareMutationResponseSchema,
  documentPublicShareProjectionSchema,
} from '../../../../shared/documents/public-share-contracts'
import { decodeApiResponse } from '../../../shared/api/decode-api-response'
import { isDocumentDraftConflictError } from './document-api-error'

export const documentsApi = {
  async listShares(projectId: string, documentId: string, signal?: AbortSignal): Promise<DocumentPublicShareListResponse> {
    const response: unknown = await $fetch(`/api/projects/${projectId}/documents/${documentId}/shares`, { signal })
    return decodeApiResponse(documentPublicShareListResponseSchema, response, 'GET /api/projects/:projectId/documents/:documentId/shares')
  },
  async openShare(
    projectId: string,
    documentId: string,
    input: DocumentPublicShareCreateRequest,
    signal?: AbortSignal,
  ): Promise<DocumentPublicShareMutationResponse> {
    const response: unknown = await $fetch(`/api/projects/${projectId}/documents/${documentId}/shares`, {
      method: 'POST', body: input, signal,
    })
    return decodeApiResponse(documentPublicShareMutationResponseSchema, response, 'POST /api/projects/:projectId/documents/:documentId/shares')
  },
  async copyShare(projectId: string, documentId: string, shareId: string, signal?: AbortSignal): Promise<DocumentPublicShareMutationResponse> {
    const response: unknown = await $fetch(`/api/projects/${projectId}/documents/${documentId}/shares/${shareId}/copy`, {
      method: 'POST', signal,
    })
    return decodeApiResponse(documentPublicShareMutationResponseSchema, response, 'POST /api/projects/:projectId/documents/:documentId/shares/:shareId/copy')
  },
  async rotateShare(projectId: string, documentId: string, shareId: string, signal?: AbortSignal): Promise<DocumentPublicShareMutationResponse> {
    const response: unknown = await $fetch(`/api/projects/${projectId}/documents/${documentId}/shares/${shareId}/rotate`, {
      method: 'POST', signal,
    })
    return decodeApiResponse(documentPublicShareMutationResponseSchema, response, 'POST /api/projects/:projectId/documents/:documentId/shares/:shareId/rotate')
  },
  async revokeShare(projectId: string, documentId: string, shareId: string, signal?: AbortSignal): Promise<DocumentPublicShareProjection> {
    const response: unknown = await $fetch(`/api/projects/${projectId}/documents/${documentId}/shares/${shareId}`, {
      method: 'DELETE', signal,
    })
    return decodeApiResponse(documentPublicShareProjectionSchema, response, 'DELETE /api/projects/:projectId/documents/:documentId/shares/:shareId')
  },
  async uploadImage(projectId: string, file: File, signal?: AbortSignal): Promise<DocumentImageUploadResponse> {
    const form = new FormData()
    form.append('file', file)
    const response: unknown = await $fetch(`/api/projects/${projectId}/documents/images`, { method: 'POST', body: form, signal })
    return decodeApiResponse(documentImageUploadResponseSchema, response, 'POST /api/projects/:projectId/documents/images')
  },
  async listRoots(projectId: string, signal?: AbortSignal): Promise<RootDocumentsResponse> {
    const response: unknown = await $fetch(`/api/projects/${projectId}/documents`, { signal })
    return decodeApiResponse(rootDocumentsResponseSchema, response, 'GET /api/projects/:projectId/documents')
  },
  async search(projectId: string, input: DocumentSearchRequest, signal?: AbortSignal): Promise<DocumentSearchResponse> {
    const response: unknown = await $fetch(`/api/projects/${projectId}/documents/search`, {
      method: 'POST', body: input, signal,
    })
    return decodeApiResponse(documentSearchResponseSchema, response, 'POST /api/projects/:projectId/documents/search')
  },
  async create(projectId: string, input: CreateDocumentRequest, signal?: AbortSignal): Promise<CreateDocumentResponse> {
    const response: unknown = await $fetch(`/api/projects/${projectId}/documents`, { method: 'POST', body: input, signal })
    return decodeApiResponse(createDocumentResponseSchema, response, 'POST /api/projects/:projectId/documents')
  },
  async listTree(projectId: string, signal?: AbortSignal): Promise<DocumentTreeResponse> {
    const response: unknown = await $fetch(`/api/projects/${projectId}/documents/tree`, { signal })
    return decodeApiResponse(documentTreeResponseSchema, response, 'GET /api/projects/:projectId/documents/tree')
  },
  async get(projectId: string, documentId: string, signal?: AbortSignal): Promise<DocumentDetailResponse> {
    const response: unknown = await $fetch(`/api/projects/${projectId}/documents/${documentId}`, { signal })
    return decodeApiResponse(documentDetailResponseSchema, response, 'GET /api/projects/:projectId/documents/:documentId')
  },
  async move(projectId: string, documentId: string, input: MoveDocumentRequest, signal?: AbortSignal): Promise<MoveDocumentResponse> {
    const response: unknown = await $fetch(`/api/projects/${projectId}/documents/${documentId}/move`, {
      method: 'PATCH', body: input, signal,
    })
    return decodeApiResponse(moveDocumentResponseSchema, response, 'PATCH /api/projects/:projectId/documents/:documentId/move')
  },
  async archive(projectId: string, documentId: string, signal?: AbortSignal): Promise<ArchiveDocumentResponse> {
    const response: unknown = await $fetch(`/api/projects/${projectId}/documents/${documentId}`, { method: 'DELETE', signal })
    return decodeApiResponse(archiveDocumentResponseSchema, response, 'DELETE /api/projects/:projectId/documents/:documentId')
  },
  async discard(projectId: string, documentId: string, signal?: AbortSignal): Promise<DiscardDocumentResponse> {
    const response: unknown = await $fetch(`/api/projects/${projectId}/documents/${documentId}/discard`, { method: 'DELETE', signal })
    return decodeApiResponse(discardDocumentResponseSchema, response, 'DELETE /api/projects/:projectId/documents/:documentId/discard')
  },
  async listArchive(projectId: string, signal?: AbortSignal): Promise<ArchivedDocumentsResponse> {
    const response: unknown = await $fetch(`/api/projects/${projectId}/documents/archive`, { signal })
    return decodeApiResponse(archivedDocumentsResponseSchema, response, 'GET /api/projects/:projectId/documents/archive')
  },
  async restore(projectId: string, documentId: string, signal?: AbortSignal): Promise<RestoreDocumentResponse> {
    const response: unknown = await $fetch(`/api/projects/${projectId}/documents/${documentId}/restore`, { method: 'POST', signal })
    return decodeApiResponse(restoreDocumentResponseSchema, response, 'POST /api/projects/:projectId/documents/:documentId/restore')
  },
  async updateDraft(
    projectId: string,
    documentId: string,
    input: UpdateDocumentDraftRequest,
    signal?: AbortSignal,
  ): Promise<UpdateDocumentDraftResult> {
    try {
      const response: unknown = await $fetch(`/api/projects/${projectId}/documents/${documentId}/draft`, {
        method: 'PATCH', body: input, signal,
      })
      const value: UpdateDocumentDraftResponse = decodeApiResponse(
        updateDocumentDraftResponseSchema,
        response,
        'PATCH /api/projects/:projectId/documents/:documentId/draft',
      )
      return { ok: true, value }
    }
    catch (error: unknown) {
      if (isDocumentDraftConflictError(error)) {
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
      const response: unknown = await $fetch(`/api/projects/${projectId}/documents/${documentId}/publish`, {
        method: 'POST', body: input, signal,
      })
      return {
        ok: true,
        value: decodeApiResponse(
          publishDocumentResponseSchema,
          response,
          'POST /api/projects/:projectId/documents/:documentId/publish',
        ),
      }
    }
    catch (error: unknown) {
      if (isDocumentDraftConflictError(error)) return { ok: false, code: DOCUMENT_DRAFT_UPDATE_CODE.DRAFT_CONFLICT }
      throw error
    }
  },
  async listVersions(projectId: string, documentId: string, signal?: AbortSignal): Promise<DocumentVersionsResponse> {
    const response: unknown = await $fetch(`/api/projects/${projectId}/documents/${documentId}/versions`, { signal })
    return decodeApiResponse(documentVersionsResponseSchema, response, 'GET /api/projects/:projectId/documents/:documentId/versions')
  },
  async getVersion(
    projectId: string,
    documentId: string,
    versionNumber: number,
    signal?: AbortSignal,
  ): Promise<DocumentVersionDetail> {
    const response: unknown = await $fetch(`/api/projects/${projectId}/documents/${documentId}/versions/${versionNumber}`, { signal })
    return decodeApiResponse(documentVersionDetailSchema, response, 'GET /api/projects/:projectId/documents/:documentId/versions/:versionNumber')
  },
  async restoreVersion(
    projectId: string,
    documentId: string,
    versionNumber: number,
    input: RestoreDocumentVersionRequest,
    signal?: AbortSignal,
  ): Promise<DocumentVersionMutationResult<RestoreDocumentVersionResponse>> {
    try {
      const response: unknown = await $fetch(`/api/projects/${projectId}/documents/${documentId}/versions/${versionNumber}/restore`, {
        method: 'POST', body: input, signal,
      })
      return {
        ok: true,
        value: decodeApiResponse(
          restoreDocumentVersionResponseSchema,
          response,
          'POST /api/projects/:projectId/documents/:documentId/versions/:versionNumber/restore',
        ),
      }
    }
    catch (error: unknown) {
      if (isDocumentDraftConflictError(error)) return { ok: false, code: DOCUMENT_DRAFT_UPDATE_CODE.DRAFT_CONFLICT }
      throw error
    }
  },
}
