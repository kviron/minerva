import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

describe('public share management HTTP boundary', () => {
  it('keeps every lifecycle endpoint session-bound, private, and delegated to the shared service', async () => {
    const sources = await Promise.all([
      read('../../../server/api/projects/[id]/documents/[documentId]/shares/index.get.ts'),
      read('../../../server/api/projects/[id]/documents/[documentId]/shares/index.post.ts'),
      read('../../../server/api/projects/[id]/documents/[documentId]/shares/[shareId]/copy.post.ts'),
      read('../../../server/api/projects/[id]/documents/[documentId]/shares/[shareId]/rotate.post.ts'),
      read('../../../server/api/projects/[id]/documents/[documentId]/shares/[shareId].delete.ts'),
    ])
    for (const source of sources) {
      expect(source).toContain('requireSession(event)')
      expect(source).toContain('getDocumentPublicShareManagementService()')
      expect(source).toContain("'Cache-Control', 'private, no-store'")
      expect(source).not.toContain('tokenCiphertext')
      expect(source).not.toContain('tokenHash')
    }
  })
})
