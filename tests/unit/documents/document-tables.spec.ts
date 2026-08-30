import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { parseDocumentContent } from '../../../server/modules/documents/content-schema'
import { extractDocumentSearchText } from '../../../server/modules/documents/search-documents'

const tableContent = {
  type: 'doc',
  content: [{
    type: 'table',
    content: [{
      type: 'tableRow',
      content: [
        {
          type: 'tableHeader',
          attrs: { colspan: 1, rowspan: 1, colwidth: null },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Сервис' }] }],
        },
        {
          type: 'tableHeader',
          attrs: { colspan: 1, rowspan: 1, colwidth: null },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Адрес' }] }],
        },
      ],
    }, {
      type: 'tableRow',
      content: [
        {
          type: 'tableCell',
          attrs: { colspan: 1, rowspan: 1, colwidth: null },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Minerva' }] }],
        },
        {
          type: 'tableCell',
          attrs: { colspan: 1, rowspan: 1, colwidth: [240] },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'minerva.local' }] }],
        },
      ],
    }],
  }],
} as const

describe('document tables', () => {
  it('accepts a structured table and includes its cells in document search text', () => {
    const parsed = parseDocumentContent(tableContent)

    expect(parsed).toEqual(tableContent)
    expect(parsed && extractDocumentSearchText(parsed)).toBe('Сервис Адрес Minerva minerva.local')
  })

  it('rejects malformed table nesting and cell dimensions', () => {
    expect(parseDocumentContent({
      type: 'doc',
      content: [{ type: 'table', content: [{ type: 'paragraph' }] }],
    })).toBeNull()
    expect(parseDocumentContent({
      type: 'doc',
      content: [{ type: 'tableRow', content: [{ type: 'paragraph' }] }],
    })).toBeNull()
    expect(parseDocumentContent({
      type: 'doc',
      content: [{
        type: 'table',
        content: [{
          type: 'tableRow',
          content: [{
            type: 'tableCell',
            attrs: { colspan: 0, rowspan: 1, colwidth: null },
            content: [{ type: 'paragraph' }],
          }],
        }],
      }],
    })).toBeNull()
  })

  it('composes table editing commands and a semantic read-only renderer', async () => {
    const [editor, toolbar, renderer] = await Promise.all([
      readFile('app/features/documents/ui/DocumentEditor.vue', 'utf8'),
      readFile('app/features/documents/ui/DocumentEditorToolbar.vue', 'utf8'),
      readFile('app/features/documents/ui/DocumentContentNode.vue', 'utf8'),
    ])

    expect(editor).toContain('TableKit')
    expect(toolbar).toContain('insertTable')
    expect(toolbar).toContain('addRowAfter')
    expect(toolbar).toContain('addColumnAfter')
    expect(toolbar).toContain('deleteRow')
    expect(toolbar).toContain('deleteColumn')
    expect(toolbar).toContain('mergeCells')
    expect(toolbar).toContain('splitCell')
    expect(toolbar).toContain('deleteTable')
    expect(renderer).toContain("node.type === 'table'")
    expect(renderer).toContain("node.type === 'tableRow'")
    expect(renderer).toContain("node.type === 'tableHeader'")
    expect(renderer).toContain("node.type === 'tableCell'")
    expect(renderer).toContain('<table')
    expect(renderer).toContain('<th')
    expect(renderer).toContain('<td')
    expect(renderer).not.toContain('v-html')
  })
})
