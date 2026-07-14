import { readFile } from 'node:fs/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  documentsApi: {
    listRoots: vi.fn(),
    create: vi.fn(),
    listTree: vi.fn(),
    get: vi.fn(),
    updateDraft: vi.fn(),
  },
}))

vi.mock('../../../../app/features/documents/api/documents-api', () => ({ documentsApi: mocks.documentsApi }))

import { DocumentsActions } from '../../../../app/features/documents/model/actions/actions'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')
const request = {
  title: 'Архитектура',
  content: { type: 'doc', content: [] },
  expectedRevision: 2,
} as const

beforeEach(() => {
  vi.clearAllMocks()
  mocks.documentsApi.updateDraft.mockResolvedValue({
    ok: true,
    value: { draftRevision: 3, updatedAt: '2026-07-14T12:00:00.000Z' },
  })
})

describe('document editor', () => {
  it('saves an explicit revisioned command through stateless actions', async () => {
    const actions = new DocumentsActions()
    await expect(actions.updateDraft('project-1', 'document-1', request)).resolves.toEqual({
      ok: true,
      value: { draftRevision: 3, updatedAt: '2026-07-14T12:00:00.000Z' },
    })
    expect(mocks.documentsApi.updateDraft).toHaveBeenCalledWith('project-1', 'document-1', request, expect.anything())
  })

  it('composes the edit route from Tiptap, manual save, and an explicit conflict state', async () => {
    const [page, editor] = await Promise.all([
      read('../../../../app/pages/projects/[id]/documents/[documentId]/edit.vue'),
      read('../../../../app/features/documents/ui/DocumentEditor.vue'),
    ])

    expect(page).toContain('<DocumentsProvider>')
    expect(page).toContain('<DocumentEditor')
    expect(editor).toContain('EditorContent')
    expect(editor).toContain('StarterKit')
    expect(editor).toContain('expectedRevision')
    expect(editor).toContain('DRAFT_CONFLICT')
    expect(editor).toContain('UiAlert')
    expect(editor).toContain('UiSpinner')
    expect(editor).not.toContain('setTimeout')
    expect(editor).not.toContain('AUTOSAVE')
    expect(editor).toContain('onBeforeRouteLeave')
    expect(editor).toContain('confirmUnsavedChanges')
    expect(editor).toContain('const savedSequence = ref(0)')
    expect(editor).toContain('dirtySequence.value > savedSequence.value')
    expect(editor).toContain("watch(title, () => markDirty(), { flush: 'sync' })")
    expect(editor).toContain('Есть несохранённые изменения')
    expect(editor).toContain('Сохранить и опубликовать')
    expect(editor).toContain('<UiDialogTitle>Сохранить и опубликовать</UiDialogTitle>')
    expect(editor).toContain('PROJECT_PERMISSION.DOCUMENTS_PUBLISH')
    expect(editor).toContain('await saveDraft()')
    expect(editor).toContain('await actions.publish(')
    expect(editor).toContain('await navigateTo(')
    expect(editor).toContain('Комментарий к версии (необязательно)')
  })
})
