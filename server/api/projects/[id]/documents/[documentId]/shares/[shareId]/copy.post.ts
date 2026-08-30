import { createError, defineEventHandler, getValidatedRouterParams, setHeader } from 'h3'
import {
  documentPublicShareMutationResponseSchema,
  documentPublicShareRecordRouteParamsSchema,
} from '../../../../../../../../shared/documents/public-share-contracts'
import { getDocumentPublicShareManagementService } from '../../../../../../../modules/documents/document-public-share-runtime'
import { unwrapDocumentPublicShareResult } from '../../../../../../../modules/documents/document-public-share-http'
import { requireSession } from '../../../../../../../modules/identity/session/require-session'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const session = await requireSession(event)
  const params = await getValidatedRouterParams(event, value => documentPublicShareRecordRouteParamsSchema.parse(value))
  const result = await getDocumentPublicShareManagementService().copy({
    projectId: params.id,
    rootDocumentId: params.documentId,
    shareId: params.shareId,
    actorUserId: session.user.id,
  })
  return documentPublicShareMutationResponseSchema.parse(unwrapDocumentPublicShareResult(result))
})
