import { readFile } from 'node:fs/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const mocks = vi.hoisted(() => ({
  documentsApi: { listRoots: vi.fn(), create: vi.fn(), listArchive: vi.fn(), restore: vi.fn() },
}))

vi.mock('../../../../app/features/documents/api/documents-api', () => ({ documentsApi: mocks.documentsApi }))

import { DocumentsActions } from '../../../../app/features/documents/model/actions/actions'
import { useDocumentsStore } from '../../../../app/features/documents/model/documents-state'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

const roots = [{
  id: '6aa8d3f3-5d50-4464-b9bc-283731a27383',
  title: 'Архитектура',
  slug: 'architecture',
  childCount: 2,
  updatedAt: '2026-07-13T10:00:00.000Z',
  publicationState: 'published',
}] as const
const archive = [{
  id: '8d9443ec-c626-4417-a8e0-c931dd378ca6',
  title: 'Старая архитектура',
  originalParentId: null,
  pageCount: 2,
  archivedAt: '2026-07-14T10:00:00.000Z',
  archivedByName: 'Admin',
}] as const

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
  mocks.documentsApi.listRoots.mockResolvedValue(roots)
  mocks.documentsApi.create.mockResolvedValue({ documentId: 'document-2' })
  mocks.documentsApi.listArchive.mockResolvedValue(archive)
  mocks.documentsApi.restore.mockResolvedValue({ restoredCount: 1, restoredAt: '2026-07-14T12:00:00.000Z' })
})

describe('documents first-level feature', () => {
  it('loads roots through stateless actions and stores a copied projection in Pinia', async () => {
    const actions = new DocumentsActions()
    const store = useDocumentsStore()

    const result = await actions.loadRoots('project-1')
    expect(result).toEqual(roots)
    expect(mocks.documentsApi.listRoots).toHaveBeenCalledWith('project-1', expect.anything())

    store.applyRoots(result ?? [])
    expect(store.roots).toEqual(roots)
    expect(store.roots).not.toBe(roots)
  })

  it('creates a document and returns its id with a refreshed root projection', async () => {
    const actions = new DocumentsActions()
    const input = { title: 'Эксплуатация', parentId: null, template: 'blank' } as const

    await expect(actions.create('project-1', input)).resolves.toEqual({
      documentId: 'document-2',
      roots,
    })
    expect(mocks.documentsApi.create).toHaveBeenCalledWith('project-1', input, expect.anything())
    expect(mocks.documentsApi.listRoots).toHaveBeenCalledWith('project-1', expect.anything())
  })

  it('loads and restores archive batches through stateless actions', async () => {
    const actions = new DocumentsActions()
    await expect(actions.loadArchive('project-1')).resolves.toEqual(archive)
    await expect(actions.restore('project-1', archive[0].id)).resolves.toEqual({ archive, roots })
    expect(mocks.documentsApi.restore).toHaveBeenCalledWith('project-1', archive[0].id, expect.anything())
  })

  it('renders root documents as links and includes loading, error, and empty states', async () => {
    const [view, list, archive, page, dialog] = await Promise.all([
      read('../../../../app/features/documents/ui/DocumentsView.vue'),
      read('../../../../app/features/documents/ui/DocumentRootList.vue'),
      read('../../../../app/features/documents/ui/DocumentsArchive.vue'),
      read('../../../../app/pages/projects/[id]/documents/index.vue'),
      read('../../../../app/features/documents/ui/CreateDocumentDialog.vue'),
    ])

    expect(page).toContain('<DocumentsProvider>')
    expect(page).toContain('<DocumentsView :project-id="projectId" />')
    expect(view).toContain('<DocumentRootList')
    expect(view).toContain('<UiTabsList>')
    expect(view).toContain('Архив')
    expect(view).toContain('<DocumentsArchive')
    expect(view).toContain('UiSkeleton')
    expect(view).toContain('UiAlert')
    expect(view).toContain('UiEmpty')
    expect(list).toContain(':to="`/projects/${projectId}/documents/${document.id}`"')
    expect(list).toContain('document.childCount')
    expect(list).toContain('block truncate text-base font-semibold')
    expect(list).toContain('block text-xs text-muted-foreground')
    expect(list).toContain("class=\"text-xs text-muted-foreground\">Черновик")
    expect(view).toContain('<CreateDocumentDialog')
    expect(view).toContain('DOCUMENTS_CREATE')
    expect(dialog).toContain('<UiDialogTitle>Создать страницу</UiDialogTitle>')
    expect(dialog).toContain('<UiFieldGroup>')
    expect(dialog).toContain('<UiSelectGroup>')
    expect(dialog).toContain('Корневой раздел')
    expect(dialog).toContain('SYSTEM_DOCUMENT_TEMPLATES')
    expect(archive).toContain('<UiAlertDialogTitle>Восстановить ветку?</UiAlertDialogTitle>')
    expect(archive).toContain('DOCUMENTS_RESTORE')
  })
})
