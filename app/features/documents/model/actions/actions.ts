import { BaseActions, type BaseActionsOptions } from '@/shared/model/baseActions'
import type {
  CreateDocumentRequest,
  DocumentDetailResponse,
  DocumentImageUploadResponse,
  ArchivedDocumentsResponse,
  DocumentVersionDetail,
  DocumentVersionMutationResult,
  DocumentVersionsResponse,
  DocumentTreeResponse,
  MoveDocumentRequest,
  PublishDocumentRequest,
  PublishDocumentResponse,
  RestoreDocumentVersionRequest,
  RestoreDocumentVersionResponse,
  RootDocumentsResponse,
  UpdateDocumentDraftRequest,
  UpdateDocumentDraftResult,
} from '../../../../../shared/documents/contracts'
import { documentsApi } from '../../api/documents-api'

export const DOCUMENT_ACTION = {
  LOAD_ROOTS: 'documents.roots.load',
  CREATE: 'document.create',
  LOAD_TREE: 'documents.tree.load',
  LOAD_DOCUMENT: 'document.load',
  MOVE: 'document.move',
  ARCHIVE: 'document.archive',
  DISCARD: 'document.discard',
  LOAD_ARCHIVE: 'documents.archive.load',
  RESTORE: 'document.restore',
  UPDATE_DRAFT: 'document.draft.update',
  PUBLISH: 'document.publish',
  LOAD_VERSIONS: 'document.versions.load',
  LOAD_VERSION: 'document.version.load',
  RESTORE_VERSION: 'document.version.restore',
  UPLOAD_IMAGE: 'document.image.upload',
} as const

export class DocumentsActions extends BaseActions {
  constructor(options: BaseActionsOptions = {}) {
    super({ ...options, analyticsTag: options.analyticsTag ?? 'documents' })
  }

  public loadRoots = this.createAsyncAction({
    name: DOCUMENT_ACTION.LOAD_ROOTS,
    run: (signal: AbortSignal, projectId: string) => documentsApi.listRoots(projectId, signal),
    idGetter: projectId => projectId,
    options: { concurrency: 'abort', mutation: false },
  })

  public uploadImage = this.createAsyncAction({
    name: DOCUMENT_ACTION.UPLOAD_IMAGE,
    run: (signal: AbortSignal, projectId: string, file: File): Promise<DocumentImageUploadResponse> =>
      documentsApi.uploadImage(projectId, file, signal),
    idGetter: projectId => projectId,
    options: { concurrency: 'ignore' },
  })

  public create = this.createAsyncAction({
    name: DOCUMENT_ACTION.CREATE,
    run: async (signal: AbortSignal, projectId: string, input: CreateDocumentRequest): Promise<{
      readonly documentId: string
      readonly roots: RootDocumentsResponse
    }> => {
      const created = await documentsApi.create(projectId, input, signal)
      const roots = await documentsApi.listRoots(projectId, signal)
      return { documentId: created.documentId, roots }
    },
    idGetter: projectId => projectId,
  })

  public loadTree = this.createAsyncAction({
    name: DOCUMENT_ACTION.LOAD_TREE,
    run: (signal: AbortSignal, projectId: string): Promise<DocumentTreeResponse> =>
      documentsApi.listTree(projectId, signal),
    idGetter: projectId => projectId,
    options: { concurrency: 'abort', mutation: false },
  })

  public loadDocument = this.createAsyncAction({
    name: DOCUMENT_ACTION.LOAD_DOCUMENT,
    run: (signal: AbortSignal, projectId: string, documentId: string): Promise<DocumentDetailResponse> =>
      documentsApi.get(projectId, documentId, signal),
    idGetter: (projectId, documentId) => `${projectId}:${documentId}`,
    options: { concurrency: 'abort', mutation: false },
  })

  public move = this.createAsyncAction({
    name: DOCUMENT_ACTION.MOVE,
    run: async (
      signal: AbortSignal,
      projectId: string,
      documentId: string,
      input: MoveDocumentRequest,
      activeDocumentId: string,
    ): Promise<{ readonly tree: DocumentTreeResponse, readonly document: DocumentDetailResponse }> => {
      await documentsApi.move(projectId, documentId, input, signal)
      const [tree, document] = await Promise.all([
        documentsApi.listTree(projectId, signal),
        documentsApi.get(projectId, activeDocumentId, signal),
      ])
      return { tree, document }
    },
    idGetter: (projectId, documentId) => `${projectId}:${documentId}`,
    options: { concurrency: 'ignore' },
  })

  public archive = this.createAsyncAction({
    name: DOCUMENT_ACTION.ARCHIVE,
    run: async (signal: AbortSignal, projectId: string, documentId: string): Promise<DocumentTreeResponse> => {
      await documentsApi.archive(projectId, documentId, signal)
      return documentsApi.listTree(projectId, signal)
    },
    idGetter: (projectId, documentId) => `${projectId}:${documentId}`,
    options: { concurrency: 'ignore' },
  })

  public discard = this.createAsyncAction({
    name: DOCUMENT_ACTION.DISCARD,
    run: async (signal: AbortSignal, projectId: string, documentId: string): Promise<DocumentTreeResponse> => {
      await documentsApi.discard(projectId, documentId, signal)
      return documentsApi.listTree(projectId, signal)
    },
    idGetter: (projectId, documentId) => `${projectId}:${documentId}`,
    options: { concurrency: 'ignore' },
  })

  public loadArchive = this.createAsyncAction({
    name: DOCUMENT_ACTION.LOAD_ARCHIVE,
    run: (signal: AbortSignal, projectId: string): Promise<ArchivedDocumentsResponse> =>
      documentsApi.listArchive(projectId, signal),
    idGetter: projectId => projectId,
    options: { concurrency: 'abort', mutation: false },
  })

  public restore = this.createAsyncAction({
    name: DOCUMENT_ACTION.RESTORE,
    run: async (signal: AbortSignal, projectId: string, documentId: string): Promise<{
      readonly archive: ArchivedDocumentsResponse
      readonly roots: RootDocumentsResponse
    }> => {
      await documentsApi.restore(projectId, documentId, signal)
      const [archive, roots] = await Promise.all([
        documentsApi.listArchive(projectId, signal),
        documentsApi.listRoots(projectId, signal),
      ])
      return { archive, roots }
    },
    idGetter: (projectId, documentId) => `${projectId}:${documentId}`,
    options: { concurrency: 'ignore' },
  })

  public updateDraft = this.createAsyncAction({
    name: DOCUMENT_ACTION.UPDATE_DRAFT,
    run: (
      signal: AbortSignal,
      projectId: string,
      documentId: string,
      input: UpdateDocumentDraftRequest,
    ): Promise<UpdateDocumentDraftResult> => documentsApi.updateDraft(projectId, documentId, input, signal),
    idGetter: (projectId, documentId) => `${projectId}:${documentId}`,
    options: { concurrency: 'ignore' },
  })

  public publish = this.createAsyncAction({
    name: DOCUMENT_ACTION.PUBLISH,
    run: (
      signal: AbortSignal,
      projectId: string,
      documentId: string,
      input: PublishDocumentRequest,
    ): Promise<DocumentVersionMutationResult<PublishDocumentResponse>> =>
      documentsApi.publish(projectId, documentId, input, signal),
    idGetter: (projectId, documentId) => `${projectId}:${documentId}`,
    options: { concurrency: 'ignore' },
  })

  public loadVersions = this.createAsyncAction({
    name: DOCUMENT_ACTION.LOAD_VERSIONS,
    run: (signal: AbortSignal, projectId: string, documentId: string): Promise<DocumentVersionsResponse> =>
      documentsApi.listVersions(projectId, documentId, signal),
    idGetter: (projectId, documentId) => `${projectId}:${documentId}`,
    options: { concurrency: 'abort', mutation: false },
  })

  public loadVersion = this.createAsyncAction({
    name: DOCUMENT_ACTION.LOAD_VERSION,
    run: (
      signal: AbortSignal,
      projectId: string,
      documentId: string,
      versionNumber: number,
    ): Promise<DocumentVersionDetail> => documentsApi.getVersion(projectId, documentId, versionNumber, signal),
    idGetter: (projectId, documentId, versionNumber) => `${projectId}:${documentId}:${versionNumber}`,
    options: { concurrency: 'abort', mutation: false },
  })

  public restoreVersion = this.createAsyncAction({
    name: DOCUMENT_ACTION.RESTORE_VERSION,
    run: (
      signal: AbortSignal,
      projectId: string,
      documentId: string,
      versionNumber: number,
      input: RestoreDocumentVersionRequest,
    ): Promise<DocumentVersionMutationResult<RestoreDocumentVersionResponse>> =>
      documentsApi.restoreVersion(projectId, documentId, versionNumber, input, signal),
    idGetter: (projectId, documentId) => `${projectId}:${documentId}`,
    options: { concurrency: 'ignore' },
  })
}
