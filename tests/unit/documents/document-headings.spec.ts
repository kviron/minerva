import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('document headings', () => {
  it('offers semantic H1 through H4 formatting and renders shadcn-vue typography', async () => {
    const [toolbar, editor, renderer] = await Promise.all([
      readFile('app/features/documents/ui/DocumentEditorToolbar.vue', 'utf8'),
      readFile('app/features/documents/ui/DocumentEditor.vue', 'utf8'),
      readFile('app/features/documents/ui/DocumentContentNode.vue', 'utf8'),
    ])

    expect(toolbar).toContain('headingLevels')
    expect(toolbar).toContain("toggleHeading({ level })")
    expect(toolbar).toContain('Заголовок 1')
    expect(toolbar).toContain('Заголовок 4')
    expect(editor).toContain(':deep(.tiptap h1)')
    expect(editor).toContain(':deep(.tiptap h4)')
    expect(renderer).toContain("level === 1 && 'text-4xl font-extrabold text-balance'")
    expect(renderer).toContain("level === 2 && 'mt-8 border-b pb-2 text-3xl'")
    expect(renderer).toContain("level === 3 && 'mt-6 text-2xl'")
    expect(renderer).toContain("level === 4 && 'mt-5 text-xl'")
  })

  it('keeps the toolbar visible while the document scrolls', async () => {
    const [toolbar, editor] = await Promise.all([
      readFile('app/features/documents/ui/DocumentEditorToolbar.vue', 'utf8'),
      readFile('app/features/documents/ui/DocumentEditor.vue', 'utf8'),
    ])

    expect(toolbar).toContain('sticky top-0 z-20 flex flex-wrap items-center gap-1 border-b bg-background')
    expect(editor).toContain('class="rounded-md border bg-background"')
    expect(editor).not.toContain('class="overflow-hidden rounded-md border bg-background"')
  })

  it('keeps document actions in the sticky toolbar without duplicating editor state', async () => {
    const [toolbar, editor] = await Promise.all([
      readFile('app/features/documents/ui/DocumentEditorToolbar.vue', 'utf8'),
      readFile('app/features/documents/ui/DocumentEditor.vue', 'utf8'),
    ])

    expect(toolbar).toContain("defineEmits<{ save: []; publish: [] }>()")
    expect(toolbar).toContain('Сохранить')
    expect(toolbar).toContain('Сохранить и опубликовать')
    expect(toolbar).toContain('Просмотр')
    expect(toolbar).toContain("emit('save')")
    expect(toolbar).toContain("emit('publish')")
    expect(editor).toContain('@save="saveDraft"')
    expect(editor).toContain('@publish="setPublishDialogOpen(true)"')
  })
})
