import { BaseActions, type BaseActionsOptions } from '@/shared/model/baseActions'
import { publicDocumentationApi } from '../api/public-documentation-api'

export class PublicDocumentationActions extends BaseActions {
  constructor(options: BaseActionsOptions = {}) {
    super({ ...options, analyticsTag: options.analyticsTag ?? 'public-documentation' })
  }

  public read = this.createAsyncAction({
    name: 'public-documentation.read',
    run: (signal: AbortSignal, token: string, documentId?: string) =>
      publicDocumentationApi.read(token, documentId, signal),
    idGetter: (_token: string, documentId?: string) => documentId ?? 'root',
    options: { concurrency: 'abort', mutation: false },
  })
}
