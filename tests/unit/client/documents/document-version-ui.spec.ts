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

  it('composes publication and a Telegram-like right details panel', async () => {
    const [viewer, controls, panel, state] = await Promise.all([
      readFile('app/features/documents/ui/DocumentViewer.vue', 'utf8'),
      readFile('app/features/documents/ui/DocumentVersionControls.vue', 'utf8'),
      readFile('app/features/documents/ui/DocumentDetailsPanel.vue', 'utf8'),
      readFile('app/features/documents/model/documents-state.ts', 'utf8'),
    ])
    expect(viewer).toContain('<DocumentVersionControls')
    expect(controls).toContain('<UiDialogTitle>Опубликовать страницу</UiDialogTitle>')
    expect(controls).toContain('Комментарий к версии (необязательно)')
    expect(controls).not.toContain('summaryError')
    expect(controls).toContain('publishRequestError')
    expect(controls).toContain('<UiAlert v-if="publishRequestError" variant="destructive" role="alert">')
    expect(controls).not.toContain('<UiFieldError')
    expect(panel).toContain("version.changeSummary || 'Без комментария'")
    expect(controls).toContain('<DocumentDetailsPanel')
    expect(panel).toContain('PanelRightIcon')
    expect(panel).toContain('aria-label="Открыть сведения о странице"')
    expect(panel).toContain('<UiSheetTitle>{{ document.title }}</UiSheetTitle>')
    expect(panel).toContain('Изображения')
    expect(panel).toContain('Файлы')
    expect(panel).toContain('Ссылки')
    expect(panel).toContain('История')
    expect(panel).toContain('selectedImage')
    expect(panel).toContain(':href="selectedImage.downloadUrl"')
    expect(panel).toContain('Скачать')
    expect(panel).toContain('<UiTabsContent v-if="canViewHistory" :value="DOCUMENT_DETAILS_TAB.HISTORY"')
    expect(panel).toContain('v-for="version in versions"')
    expect(panel).toContain("emit('selectVersion', version)")
    expect(panel).not.toContain('setPanelOpen(false)\n  emit(\'openHistory\')')
    expect(controls).not.toContain('<UiSheet :open="historyOpen"')
    expect(controls).not.toContain('{{ version.title }}')
    expect(panel).toContain('class="h-auto w-full justify-start p-3 text-left"')
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
