import { describe, expect, it } from 'vitest'
import { toTiptapEditorContent } from '../../../../app/features/documents/model/editor-content'

describe('document editor content', () => {
  it('normalizes an empty saved document to a valid editable paragraph', () => {
    expect(toTiptapEditorContent({ type: 'doc', content: [] })).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    })
  })

  it('preserves non-empty saved content', () => {
    expect(toTiptapEditorContent({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Текст' }] }],
    })).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Текст' }] }],
    })
  })
})
