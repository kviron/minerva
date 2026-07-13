import { BaseActions, type BaseActionsOptions } from '@/shared/model/baseActions'
import type {
  CreateDocumentRequest,
  DocumentDetailResponse,
  DocumentTreeResponse,
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
  UPDATE_DRAFT: 'document.draft.update',
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
}
