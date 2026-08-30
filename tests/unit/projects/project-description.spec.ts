import { describe, expect, it } from 'vitest'
import { parseProjectDescription } from '../../../server/modules/projects/project-description'

describe('project description', () => {
  it('keeps rich content and derives the list projection text', () => {
    expect(parseProjectDescription({
      type: 'doc',
      content: [{ type: 'paragraph', content: [
        { type: 'text', text: ' Minerva ', marks: [{ type: 'bold' }] },
        { type: 'text', text: 'docs' },
      ] }],
    })).toEqual({
      ok: true,
      value: {
        content: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [
            { type: 'text', text: ' Minerva ', marks: [{ type: 'bold' }] },
            { type: 'text', text: 'docs' },
          ] }],
        },
        plainText: 'Minerva docs',
      },
    })
  })

  it('rejects document-only images and descriptions longer than the project limit', () => {
    expect(parseProjectDescription({
      type: 'doc',
      content: [{ type: 'image', attrs: { imageId: '21b9fc31-6e20-4399-a2ea-fb4de1024821' } }],
    })).toEqual({ ok: false, code: 'INVALID_DESCRIPTION' })
    expect(parseProjectDescription({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x'.repeat(2001) }] }],
    })).toEqual({ ok: false, code: 'INVALID_DESCRIPTION' })
  })
})
