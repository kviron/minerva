import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { extractReferencedImageIds, parseDocumentContent } from '../../../server/modules/documents/content-schema'
import { validateDocumentImageUpload } from '../../../server/modules/files/document-images'

const IMAGE_ID = '11111111-1111-4111-8111-111111111111'

describe('document images', () => {
  it('accepts image nodes and extracts unique stable ids in content order', () => {
    const content = parseDocumentContent({
      type: 'doc',
      content: [
        { type: 'image', attrs: { imageId: IMAGE_ID, alt: 'Схема', width: 640, height: 360 } },
        { type: 'image', attrs: { imageId: IMAGE_ID, alt: '' } },
      ],
    })
    expect(content).not.toBeNull()
    expect(content && extractReferencedImageIds(content)).toEqual([IMAGE_ID])
  })

  it('rejects malformed image attributes', () => {
    expect(parseDocumentContent({ type: 'doc', content: [{ type: 'image', attrs: { imageId: 'bad' } }] })).toBeNull()
    expect(parseDocumentContent({ type: 'doc', content: [{ type: 'image', attrs: { imageId: IMAGE_ID, alt: 'x'.repeat(501) } }] })).toBeNull()
    expect(parseDocumentContent({ type: 'doc', content: [{ type: 'image', attrs: { imageId: IMAGE_ID, width: 159 } }] })).toBeNull()
    expect(parseDocumentContent({ type: 'doc', content: [{ type: 'image', attrs: { imageId: IMAGE_ID, width: 1600.5 } }] })).toBeNull()
    expect(parseDocumentContent({ type: 'doc', content: [{ type: 'image', attrs: { imageId: IMAGE_ID, height: 89 } }] })).toBeNull()
  })

  it('validates declared MIME type and file signature', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1])
    expect(validateDocumentImageUpload({ filename: ' diagram.png ', mimeType: 'image/png', bytes: png })).toEqual({
      ok: true,
      value: { filename: 'diagram.png', mimeType: 'image/png', bytes: png },
    })
    expect(validateDocumentImageUpload({ filename: 'fake.png', mimeType: 'image/png', bytes: Buffer.from('not png') })).toEqual({
      ok: false,
      code: 'INVALID_IMAGE',
    })
  })

  it('serves an explicit attachment response for the download action', async () => {
    const endpoint = await readFile('server/api/projects/[id]/documents/images/[imageId].get.ts', 'utf8')

    expect(endpoint).toContain("getQuery(event).download === '1'")
    expect(endpoint).toContain("download ? 'attachment' : 'inline'")
    expect(endpoint).toContain('encodeURIComponent(image.filename)')
  })
})
