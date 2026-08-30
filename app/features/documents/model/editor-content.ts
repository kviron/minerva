import type { JSONContent } from '@tiptap/core'
import type { DocumentContent, DocumentContentNode } from '../../../../shared/documents/contracts'
import { documentContentSchema } from '../../../../shared/documents/contracts'

export const parseEditorDocumentContent = (value: unknown): DocumentContent => {
  const parsed = documentContentSchema.safeParse(value)
  if (!parsed.success) throw new Error('Invalid editor document content')
  return parsed.data
}

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

export const toTiptapEditorContent = (content: DocumentContent): JSONContent => {
  const editorContent: JSONContent[] = content.content.length > 0
    ? content.content.map(toEditorNode)
    : [{ type: 'paragraph' }]

  return {
    type: 'doc',
    content: editorContent,
  }
}
