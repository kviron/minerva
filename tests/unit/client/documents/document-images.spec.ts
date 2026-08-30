import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { calculateDocumentImageSize } from '../../../../app/features/documents/model/document-image'

describe('document image UI', () => {
  it('resizes freely by default and preserves aspect ratio only with Shift', () => {
    expect(calculateDocumentImageSize({ startWidth: 400, startHeight: 200, deltaX: 100, deltaY: 80, axis: 'both', preserveAspectRatio: false }))
      .toEqual({ width: 500, height: 280 })
    expect(calculateDocumentImageSize({ startWidth: 400, startHeight: 200, deltaX: 100, deltaY: 10, axis: 'both', preserveAspectRatio: true }))
      .toEqual({ width: 500, height: 250 })
    expect(calculateDocumentImageSize({ startWidth: 400, startHeight: 200, deltaX: 100, deltaY: 80, axis: 'width', preserveAspectRatio: false }))
      .toEqual({ width: 500, height: 200 })
    expect(calculateDocumentImageSize({ startWidth: 400, startHeight: 200, deltaX: 100, deltaY: 80, axis: 'height', preserveAspectRatio: false }))
      .toEqual({ width: 400, height: 280 })
  })

  it('uploads an image through actions and inserts a stable image node', async () => {
    const [toolbar, actions, api, editor] = await Promise.all([
      readFile('app/features/documents/ui/DocumentEditorToolbar.vue', 'utf8'),
      readFile('app/features/documents/model/actions/actions.ts', 'utf8'),
      readFile('app/features/documents/api/documents-api.ts', 'utf8'),
      readFile('app/features/documents/ui/DocumentEditor.vue', 'utf8'),
    ])
    expect(toolbar).toContain('Вставить изображение')
    expect(toolbar).toContain("type: 'image'")
    expect(toolbar).toContain('imageId: uploaded.id')
    expect(actions).toContain('UPLOAD_IMAGE')
    expect(api).toContain("form.append('file', file)")
    expect(editor).toContain('createDocumentImageExtension(props.projectId)')
  })

  it('renders images only through the authorized application endpoint', async () => {
    const [node, extension] = await Promise.all([
      readFile('app/features/documents/ui/DocumentContentNode.vue', 'utf8'),
      readFile('app/features/documents/model/document-image.ts', 'utf8'),
    ])
    expect(node).toContain('documentImageUrl(linkContext.projectId, imageId)')
    expect(node).toContain('node.type === \'image\'')
    expect(node).not.toContain('rounded-md border object-contain')
    expect(extension).toContain("createResizeHandle('width'")
    expect(extension).toContain("createResizeHandle('height'")
    expect(extension).toContain("createResizeHandle('both'")
    expect(extension).not.toContain('bg-primary')
    expect(extension).toContain("wrapper.className = 'relative my-4 inline-block max-w-full self-start align-top'")
    expect(extension).toContain('setNodeMarkup')
    expect(extension).toContain('preserveAspectRatio: moveEvent.shiftKey')
    expect(extension).toContain('object-cover')
    expect(extension).toContain("image.className = 'block max-w-full rounded-md border object-cover'")
    expect(extension).not.toContain('rounded-md border object-contain')
  })
})
