import { describe, expect, it } from 'vitest'
import { createDocumentPublicShareCrypto } from '../../../server/modules/documents/public-share-crypto'

const key = Buffer.alloc(32, 7)
const context = {
  projectId: '00000000-0000-4000-8000-000000000401',
  rootDocumentId: '00000000-0000-4000-8000-000000000402',
  shareId: '00000000-0000-4000-8000-000000000403',
}

describe('public document share crypto', () => {
  it('round-trips only under the exact document-share context', () => {
    const crypto = createDocumentPublicShareCrypto({
      activeVersion: 1,
      keys: new Map([[1, key]]),
      random: size => Buffer.alloc(size, 3),
    })
    const envelope = crypto.encrypt('token', context)
    expect(crypto.decrypt(envelope, context)).toBe('token')
    expect(() => crypto.decrypt(envelope, { ...context, rootDocumentId: crypto.randomToken() }))
      .toThrow('Public document share unavailable')
  })

  it('generates a URL-safe 32-byte capability token', () => {
    const crypto = createDocumentPublicShareCrypto({
      activeVersion: 1,
      keys: new Map([[1, key]]),
      random: size => Buffer.alloc(size, 255),
    })
    expect(crypto.randomToken()).toMatch(/^[A-Za-z0-9_-]{43}$/u)
  })
})

