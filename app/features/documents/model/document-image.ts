import { mergeAttributes, Node } from '@tiptap/core'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

export const documentImageId = (value: unknown): string | null =>
  typeof value === 'string' && UUID_PATTERN.test(value) ? value.toLowerCase() : null

export const documentImageUrl = (projectId: string, imageId: string): string =>
  `/api/projects/${projectId}/documents/images/${imageId}`

export const createDocumentImageExtension = (projectId: string) => Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      imageId: { default: null },
      alt: { default: '' },
    }
  },
  renderHTML({ HTMLAttributes }) {
    const imageId = documentImageId(HTMLAttributes.imageId)
    if (!imageId) return ['span', { 'data-invalid-document-image': '' }, 'Недоступное изображение']
    const alt = typeof HTMLAttributes.alt === 'string' ? HTMLAttributes.alt : ''
    return ['img', mergeAttributes({
      src: documentImageUrl(projectId, imageId),
      alt,
      'data-document-image-id': imageId,
      class: 'my-4 max-h-[40rem] max-w-full rounded-md border object-contain',
    })]
  },
})
