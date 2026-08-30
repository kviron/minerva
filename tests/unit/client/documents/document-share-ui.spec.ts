import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

describe('document share dialog', () => {
  it('uses installed accessible primitives and keeps the URL in local component state', async () => {
    const [dialog, toolbar, viewer, editor, tree, branch, actions] = await Promise.all([
      read('../../../../app/features/documents/ui/DocumentShareDialog.vue'),
      read('../../../../app/features/documents/ui/DocumentEditorToolbar.vue'),
      read('../../../../app/features/documents/ui/DocumentViewer.vue'),
      read('../../../../app/features/documents/ui/DocumentEditor.vue'),
      read('../../../../app/features/documents/ui/DocumentTree.vue'),
      read('../../../../app/features/documents/ui/DocumentTreeBranch.vue'),
      read('../../../../app/features/documents/model/actions/actions.ts'),
    ])
    expect(dialog).toContain('<UiDialogTitle>Поделиться документацией</UiDialogTitle>')
    expect(dialog).toContain('<UiRadioGroup')
    expect(dialog).toContain('<UiAlertDialogTitle>')
    expect(dialog).toContain('<UiAlert')
    expect(dialog).toContain('<UiBadge')
    expect(dialog).toContain('const revealedUrl = ref<string | null>(null)')
    expect(dialog).not.toContain('useDocumentsStore')
    expect(toolbar).toContain('<Share2')
    expect(toolbar).toContain('<DocumentShareDialog')
    expect(viewer).toContain('<Share2')
    expect(viewer).toContain('<DocumentShareDialog')
    expect(editor).toContain('PROJECT_PERMISSION.DOCUMENTS_SHARE')
    expect(branch).toContain('PROJECT_PERMISSION.DOCUMENTS_SHARE')
    expect(branch).toContain("emit('share', node)")
    expect(branch).toContain('Поделиться')
    expect(tree).toContain('@share="openShare"')
    expect(tree).toContain('<DocumentShareDialog')
    expect(tree).toContain(':document-id="selectedShare.id"')
    expect(tree).toContain(':has-published-version="selectedShare.hasPublishedVersions"')
    expect(actions).toContain('SHARE_LIST')
    expect(actions).toContain('SHARE_ROTATE')
  })
})
