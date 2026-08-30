import {
  DOCUMENT_PUBLIC_SHARE_MUTATION,
  DOCUMENT_PUBLIC_SHARE_TRANSITION,
} from '../../../shared/documents/public-share-constants'

type ShareMutation =
  typeof DOCUMENT_PUBLIC_SHARE_MUTATION[keyof typeof DOCUMENT_PUBLIC_SHARE_MUTATION]

interface ShareLifecycleRecord {
  readonly id: string
  readonly revokedAt: Date | null
}

export type DocumentPublicShareTransition =
  | Readonly<{ type: typeof DOCUMENT_PUBLIC_SHARE_TRANSITION.CREATE }>
  | Readonly<{
    type:
      | typeof DOCUMENT_PUBLIC_SHARE_TRANSITION.ROTATE
      | typeof DOCUMENT_PUBLIC_SHARE_TRANSITION.REVOKE
      | typeof DOCUMENT_PUBLIC_SHARE_TRANSITION.REPLAY
    shareId: string
  }>
  | Readonly<{ type: typeof DOCUMENT_PUBLIC_SHARE_TRANSITION.INVALID }>

export const decideDocumentPublicShareTransition = (
  record: ShareLifecycleRecord | null,
  mutation: ShareMutation,
): DocumentPublicShareTransition => {
  if (mutation === DOCUMENT_PUBLIC_SHARE_MUTATION.OPEN) {
    return record === null || record.revokedAt !== null
      ? { type: DOCUMENT_PUBLIC_SHARE_TRANSITION.CREATE }
      : { type: DOCUMENT_PUBLIC_SHARE_TRANSITION.REPLAY, shareId: record.id }
  }
  if (record === null) return { type: DOCUMENT_PUBLIC_SHARE_TRANSITION.INVALID }
  if (mutation === DOCUMENT_PUBLIC_SHARE_MUTATION.REVOKE) {
    return record.revokedAt === null
      ? { type: DOCUMENT_PUBLIC_SHARE_TRANSITION.REVOKE, shareId: record.id }
      : { type: DOCUMENT_PUBLIC_SHARE_TRANSITION.REPLAY, shareId: record.id }
  }
  return record.revokedAt === null
    ? { type: DOCUMENT_PUBLIC_SHARE_TRANSITION.ROTATE, shareId: record.id }
    : { type: DOCUMENT_PUBLIC_SHARE_TRANSITION.INVALID }
}

