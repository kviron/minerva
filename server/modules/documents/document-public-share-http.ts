import { createError } from 'h3'
import {
  DOCUMENT_PUBLIC_SHARE_ERROR,
} from './document-public-shares'

export const unwrapDocumentPublicShareResult = <Value>(result:
  | Readonly<{ ok: true, value: Value }>
  | Readonly<{ ok: false, code: string }>,
): Value => {
  if (result.ok) return result.value
  if (result.code === DOCUMENT_PUBLIC_SHARE_ERROR.NOT_FOUND) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
  if (result.code === DOCUMENT_PUBLIC_SHARE_ERROR.INVALID_TRANSITION) {
    throw createError({ statusCode: 409, statusMessage: 'Share state conflict' })
  }
  throw createError({ statusCode: 500, statusMessage: 'Public share operation failed' })
}
