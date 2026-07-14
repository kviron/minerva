import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('document internal link UI', () => {
  it('provides a titled page picker and inserts stable document links', async () => {
    const [toolbar, editor] = await Promise.all([
      readFile('app/features/documents/ui/DocumentEditorToolbar.vue', 'utf8'),
      readFile('app/features/documents/ui/DocumentEditor.vue', 'utf8'),
    ])
    expect(toolbar).toContain('Вставить ссылку на страницу')
    expect(toolbar).toContain('document:${document.id}')
    expect(toolbar).toContain('UiDialogTitle')
    expect(editor).toContain(':documents="state.tree"')
    expect(editor).toContain('[&_a]:text-primary')
    expect(editor).toContain('[&_a]:underline')
    expect(editor).toContain('[&_a]:underline-offset-4')
  })

  it('renders project-local internal links and current backlinks', async () => {
    const [node, viewer] = await Promise.all([
      readFile('app/features/documents/ui/DocumentContentNode.vue', 'utf8'),
      readFile('app/features/documents/ui/DocumentViewer.vue', 'utf8'),
    ])
    expect(node).toContain('document:')
    expect(node).toContain('Недоступная страница')
    expect(viewer).toContain('На эту страницу ссылаются')
    expect(viewer).toContain('document.backlinks')
  })
})
