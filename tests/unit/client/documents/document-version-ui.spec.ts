import { readFile } from 'node:fs/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  documentsApi: {
    publish: vi.fn(),
    listVersions: vi.fn(),
    getVersion: vi.fn(),
    restoreVersion: vi.fn(),
  },
}))

vi.mock('../../../../app/features/documents/api/documents-api', () => ({ documentsApi: mocks.documentsApi }))

import { DocumentsActions } from '../../../../app/features/documents/model/actions/actions'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.documentsApi.publish.mockResolvedValue({ ok: true, value: { versionNumber: 1, publishedAt: '2026-07-14T12:00:00.000Z' } })
  mocks.documentsApi.listVersions.mockResolvedValue([])
})

describe('document version UI', () => {
  it('orchestrates publication and history through stateless actions', async () => {
    const actions = new DocumentsActions()
    await actions.publish('project-1', 'document-1', { changeSummary: 'Первый выпуск', expectedRevision: 2 })
    await actions.loadVersions('project-1', 'document-1')

    expect(mocks.documentsApi.publish).toHaveBeenCalledWith(
      'project-1',
      'document-1',
      { changeSummary: 'Первый выпуск', expectedRevision: 2 },
      expect.anything(),
    )
    expect(mocks.documentsApi.listVersions).toHaveBeenCalledWith('project-1', 'document-1', expect.anything())
  })

  it('composes titled publish, history, preview, and restore confirmation overlays', async () => {
    const [viewer, controls, state] = await Promise.all([
      readFile('app/features/documents/ui/DocumentViewer.vue', 'utf8'),
      readFile('app/features/documents/ui/DocumentVersionControls.vue', 'utf8'),
      readFile('app/features/documents/model/documents-state.ts', 'utf8'),
    ])
    expect(viewer).toContain('<DocumentVersionControls')
    expect(controls).toContain('<UiDialogTitle>Опубликовать страницу</UiDialogTitle>')
    expect(controls).toContain('Комментарий к версии (необязательно)')
    expect(controls).not.toContain('summaryError')
    expect(controls).toContain('publishRequestError')
    expect(controls).toContain('<UiAlert v-if="publishRequestError" variant="destructive" role="alert">')
    expect(controls).not.toContain('<UiFieldError')
    expect(controls).toContain("version.changeSummary || 'Без комментария'")
    expect(controls).toContain('<UiSheetTitle>История версий</UiSheetTitle>')
    expect(controls).toContain('<h3 class="px-4 text-sm font-medium">{{ document.title }}</h3>')
    expect(controls).not.toContain('{{ version.title }}')
    expect(controls).toContain('class="h-auto w-full justify-start p-3 text-left"')
    expect(controls).toContain('<UiDialog :open="versionPreviewOpen"')
    expect(controls).toContain('<UiDialogTitle>Предпросмотр версии</UiDialogTitle>')
    expect(controls).toContain('sm:max-w-4xl')
    expect(controls).not.toContain('md:grid-cols-[16rem_minmax(0,1fr)]')
    expect(controls).toContain('<UiAlertDialogTitle>Восстановить версию?')
    expect(controls).toContain('DOCUMENTS_PUBLISH')
    expect(controls).toContain("props.document.publicationState === 'draft'")
    expect(controls).toContain('DOCUMENTS_VIEW_HISTORY')
    expect(controls).toContain('DOCUMENTS_UPDATE_DRAFT')
    expect(controls).toContain('<DocumentContentNode')
    expect(state).toContain('versions: DocumentVersionSummary[]')
    expect(state).toContain('selectedVersion: DocumentVersionDetail | null')
  })
})
