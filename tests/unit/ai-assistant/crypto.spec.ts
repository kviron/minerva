import { describe, expect, it } from 'vitest'
import { createProjectAiCrypto, ProjectAiDecryptionError } from '../../../server/modules/ai-assistant/crypto'

const keys = new Map([[1, Buffer.alloc(32, 7)]])

describe('project AI provider-key encryption', () => {
  it('round-trips with randomized ciphertext and AI-specific associated data', () => {
    let nonce = 0
    const crypto = createProjectAiCrypto({
      activeVersion: 1,
      keys,
      random: size => Buffer.alloc(size, ++nonce),
    })
    const context = {
      projectId: '00000000-0000-4000-8000-000000000091',
      connectionId: '00000000-0000-4000-8000-000000000092',
    }

    const first = crypto.encrypt('sk-private', context)
    const second = crypto.encrypt('sk-private', context)

    expect(first.ciphertext).not.toBe(second.ciphertext)
    expect(crypto.decrypt(first, context)).toBe('sk-private')
    expect(() => crypto.decrypt(first, { ...context, projectId: '00000000-0000-4000-8000-000000000099' }))
      .toThrow(ProjectAiDecryptionError)
  })

  it('cannot decrypt a credential envelope even with the same key ring', async () => {
    const { createCredentialCrypto } = await import('../../../server/modules/credentials/crypto')
    const credentialCrypto = createCredentialCrypto({ activeVersion: 1, keys, random: size => Buffer.alloc(size, 3) })
    const aiCrypto = createProjectAiCrypto({ activeVersion: 1, keys, random: size => Buffer.alloc(size, 3) })
    const envelope = credentialCrypto.encrypt('shared-secret', {
      projectId: '00000000-0000-4000-8000-000000000091',
      categoryId: '00000000-0000-4000-8000-000000000093',
      credentialId: '00000000-0000-4000-8000-000000000094',
      field: 'password',
    })

    expect(() => aiCrypto.decrypt(envelope, {
      projectId: '00000000-0000-4000-8000-000000000091',
      connectionId: '00000000-0000-4000-8000-000000000094',
    })).toThrow(ProjectAiDecryptionError)
  })

  it('fails safely when the configured key ring is wrong', () => {
    const writer = createProjectAiCrypto({ activeVersion: 1, keys, random: size => Buffer.alloc(size, 4) })
    const reader = createProjectAiCrypto({ activeVersion: 1, keys: new Map([[1, Buffer.alloc(32, 8)]]) })
    const context = {
      projectId: '00000000-0000-4000-8000-000000000091',
      connectionId: '00000000-0000-4000-8000-000000000092',
    }

    expect(() => reader.decrypt(writer.encrypt('sk-private', context), context)).toThrow(ProjectAiDecryptionError)
  })
})
