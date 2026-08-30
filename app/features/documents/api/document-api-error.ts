import { z } from 'zod'
import { documentDraftUpdateErrorResponseSchema } from '../../../../shared/documents/contracts'
import { DOCUMENT_DRAFT_UPDATE_CODE } from '../../../../shared/documents/constants'

const fetchDocumentDraftErrorSchema = z.object({
  data: documentDraftUpdateErrorResponseSchema,
}).passthrough()

export const isDocumentDraftConflictError = (rawError: unknown): boolean => {
  const parsed = fetchDocumentDraftErrorSchema.safeParse(rawError)
  return parsed.success
    && parsed.data.data.data.code === DOCUMENT_DRAFT_UPDATE_CODE.DRAFT_CONFLICT
}
