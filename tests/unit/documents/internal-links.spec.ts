import { describe, expect, it } from 'vitest'
import { parseDocumentContent, extractInternalDocumentLinkTargetIds } from '../../../server/modules/documents/content-schema'
import { validateDocumentDraftUpdate } from '../../../server/modules/documents/update-document-draft'

const targetA = '00000000-0000-4000-8000-000000000011'
const targetB = '00000000-0000-4000-8000-000000000012'
const content = {
  type: 'doc',
  content: [{
    type: 'paragraph',
    content: [
      { type: 'text', text: 'A', marks: [{ type: 'link', attrs: { href: `document:${targetA}` } }] },
      { type: 'text', text: ' external', marks: [{ type: 'link', attrs: { href: 'https://example.com' } }] },
      { type: 'text', text: ' B', marks: [{ type: 'link', attrs: { href: `document:${targetB}` } }] },
      { type: 'text', text: ' A again', marks: [{ type: 'link', attrs: { href: `document:${targetA}` } }] },
    ],
  }],
} as const

describe('document internal links', () => {
  it('validates stable document links and extracts unique targets in content order', () => {
    const parsed = parseDocumentContent(content)
    expect(parsed).not.toBeNull()
    expect(parsed && extractInternalDocumentLinkTargetIds(parsed)).toEqual([targetA, targetB])
  })

  it('rejects malformed document link schemes', () => {
    expect(parseDocumentContent({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{
        type: 'text',
        text: 'Bad',
        marks: [{ type: 'link', attrs: { href: 'document:not-a-uuid' } }],
      }] }],
    })).toBeNull()
  })

  it('derives targets during draft validation rather than trusting the client', () => {
    const result = validateDocumentDraftUpdate({
      actorUserId: '00000000-0000-4000-8000-000000000001',
      projectId: '00000000-0000-4000-8000-000000000002',
      documentId: '00000000-0000-4000-8000-000000000003',
      channel: 'web',
      title: 'Links',
      content,
      expectedRevision: 0,
    })
    expect(result).toMatchObject({ ok: true, value: { internalLinkTargetIds: [targetA, targetB] } })
  })
})
