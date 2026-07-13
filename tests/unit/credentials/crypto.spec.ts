import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  CredentialDecryptionError,
  createCredentialCrypto,
  serializeCredentialSecretContext,
} from '../../../server/modules/credentials/crypto'

const key1 = randomBytes(32)
const key2 = randomBytes(32)
const context = {
  projectId: '11111111-1111-4111-8111-111111111111',
  categoryId: '22222222-2222-4222-8222-222222222222',
  credentialId: '33333333-3333-4333-8333-333333333333',
  field: 'password',
} as const

describe('credential crypto', () => {
  it('round trips with AES-256-GCM and emits randomized envelopes', () => {
    const crypto = createCredentialCrypto({ activeVersion: 1, keys: new Map([[1, key1]]) })
    const first = crypto.encrypt('super-secret', context)
    const second = crypto.encrypt('super-secret', context)

    expect(first.keyVersion).toBe(1)
    expect(first.nonce).not.toBe(second.nonce)
    expect(first.ciphertext).not.toBe(second.ciphertext)
    expect(crypto.decrypt(first, context)).toBe('super-secret')
    expect(crypto.decrypt(second, context)).toBe('super-secret')
  })

  it('binds ciphertext to deterministic associated data', () => {
    expect(serializeCredentialSecretContext(context)).toBe(
      'minerva:credential:v1|11111111-1111-4111-8111-111111111111|22222222-2222-4222-8222-222222222222|33333333-3333-4333-8333-333333333333|password',
    )

    const crypto = createCredentialCrypto({ activeVersion: 1, keys: new Map([[1, key1]]) })
    const envelope = crypto.encrypt('secret', context)
    expect(() => crypto.decrypt(envelope, { ...context, field: 'login' })).toThrow(CredentialDecryptionError)
  })

  it('fails safely for tampering, an unknown version, or a wrong key', () => {
    const crypto = createCredentialCrypto({ activeVersion: 1, keys: new Map([[1, key1]]) })
    const envelope = crypto.encrypt('secret', context)
    const changed = Buffer.from(envelope.ciphertext, 'base64')
    changed[0] = changed[0]! ^ 1

    const attempts = [
      () => crypto.decrypt({ ...envelope, ciphertext: changed.toString('base64') }, context),
      () => crypto.decrypt({ ...envelope, keyVersion: 99 }, context),
      () => createCredentialCrypto({ activeVersion: 1, keys: new Map([[1, key2]]) }).decrypt(envelope, context),
    ]

    for (const attempt of attempts) {
      expect(attempt).toThrowError(new CredentialDecryptionError())
      expect(attempt).not.toThrow(/auth|key|cipher|nonce|secret/iu)
    }
  })

  it('rejects invalid key configuration', () => {
    expect(() => createCredentialCrypto({ activeVersion: 2, keys: new Map([[1, key1]]) })).toThrow('active key version')
    expect(() => createCredentialCrypto({ activeVersion: 1, keys: new Map([[1, randomBytes(16)]]) })).toThrow('32 bytes')
  })
})
