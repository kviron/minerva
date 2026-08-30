import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { redactPublicDocumentationPath } from '../../../server/modules/documents/public-documentation-http'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

describe('public documentation HTTP boundary', () => {
  it('redacts capability segments without retaining the presented token', () => {
    const token = 'C'.repeat(43)
    const redacted = redactPublicDocumentationPath(`/api/public/documentation/${token}/pages/id`)
    expect(redacted).toBe('/api/public/documentation/[capability]/pages/id')
    expect(redacted).not.toContain(token)
  })

  it('keeps all public endpoints behind the same headers and unavailable response', async () => {
    const [root, page, image, boundary] = await Promise.all([
      read('../../../server/api/public/documentation/[token].get.ts'),
      read('../../../server/api/public/documentation/[token]/pages/[documentId].get.ts'),
      read('../../../server/api/public/documentation/[token]/images/[imageId].get.ts'),
      read('../../../server/modules/documents/public-documentation-http.ts'),
    ])
    for (const source of [root, page, image]) {
      expect(source).toContain('setPublicDocumentationHeaders(event)')
      expect(source).toContain('publicDocumentationUnavailable(event)')
      expect(source).not.toContain('requireSession')
    }
    expect(boundary).toContain("'Cache-Control', 'no-store'")
    expect(boundary).toContain("'Referrer-Policy', 'no-referrer'")
    expect(boundary).toContain("'X-Robots-Tag', 'noindex, nofollow, noarchive'")
    expect(boundary).toContain('consumePublicDocumentationFailureRateLimit')
    expect(boundary).toContain('setResponseStatus(event, 404')
    expect(boundary).toContain('setResponseStatus(event, 429')
    expect(boundary).not.toContain('createError')
    expect(boundary).not.toContain('console.')
  })
})
