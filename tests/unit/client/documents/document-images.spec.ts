import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('document image UI', () => {
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
    const node = await readFile('app/features/documents/ui/DocumentContentNode.vue', 'utf8')
    expect(node).toContain('documentImageUrl(linkContext.projectId, imageId)')
    expect(node).toContain('node.type === \'image\'')
  })
})
