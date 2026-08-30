import { describe, expect, it } from 'vitest'
import {
  decideDocumentPublicShareTransition,
} from '../../../server/modules/documents/public-share-lifecycle'
import {
  DOCUMENT_PUBLIC_SHARE_MUTATION,
  DOCUMENT_PUBLIC_SHARE_TRANSITION,
} from '../../../shared/documents/public-share-constants'

const active = { id: 'share-1', revokedAt: null }
const revoked = { id: 'share-1', revokedAt: new Date('2026-08-02T10:00:00.000Z') }

describe('public document share lifecycle', () => {
  it('creates when no active capability exists and replays open for an active one', () => {
    expect(decideDocumentPublicShareTransition(null, DOCUMENT_PUBLIC_SHARE_MUTATION.OPEN))
      .toEqual({ type: DOCUMENT_PUBLIC_SHARE_TRANSITION.CREATE })
    expect(decideDocumentPublicShareTransition(active, DOCUMENT_PUBLIC_SHARE_MUTATION.OPEN))
      .toEqual({ type: DOCUMENT_PUBLIC_SHARE_TRANSITION.REPLAY, shareId: active.id })
  })

  it('rotates or revokes only an active capability', () => {
    expect(decideDocumentPublicShareTransition(active, DOCUMENT_PUBLIC_SHARE_MUTATION.ROTATE))
      .toEqual({ type: DOCUMENT_PUBLIC_SHARE_TRANSITION.ROTATE, shareId: active.id })
    expect(decideDocumentPublicShareTransition(active, DOCUMENT_PUBLIC_SHARE_MUTATION.REVOKE))
      .toEqual({ type: DOCUMENT_PUBLIC_SHARE_TRANSITION.REVOKE, shareId: active.id })
  })

  it('replays repeated revocation and rejects impossible transitions', () => {
    expect(decideDocumentPublicShareTransition(revoked, DOCUMENT_PUBLIC_SHARE_MUTATION.REVOKE))
      .toEqual({ type: DOCUMENT_PUBLIC_SHARE_TRANSITION.REPLAY, shareId: revoked.id })
    expect(decideDocumentPublicShareTransition(null, DOCUMENT_PUBLIC_SHARE_MUTATION.ROTATE))
      .toEqual({ type: DOCUMENT_PUBLIC_SHARE_TRANSITION.INVALID })
    expect(decideDocumentPublicShareTransition(revoked, DOCUMENT_PUBLIC_SHARE_MUTATION.ROTATE))
      .toEqual({ type: DOCUMENT_PUBLIC_SHARE_TRANSITION.INVALID })
  })
})

