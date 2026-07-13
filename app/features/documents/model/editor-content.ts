import type { JSONContent } from '@tiptap/core'
import type { DocumentContent, DocumentContentNode } from '../../../../shared/documents/contracts'

const toEditorNode = (node: DocumentContentNode): JSONContent => ({
  type: node.type,
  ...(node.attrs ? { attrs: { ...node.attrs } } : {}),
  ...(node.content ? { content: node.content.map(toEditorNode) } : {}),
  ...(node.marks
    ? {
        marks: node.marks.map(mark => ({
          type: mark.type,
          ...(mark.attrs ? { attrs: { ...mark.attrs } } : {}),
        })),
      }
    : {}),
  ...(node.text !== undefined ? { text: node.text } : {}),
})

export const toTiptapEditorContent = (content: DocumentContent): JSONContent => ({
  type: 'doc',
  content: content.content.map(toEditorNode),
})
