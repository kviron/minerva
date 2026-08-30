import { readFile } from 'node:fs/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { documentsApi } from '../../../../app/features/documents/api/documents-api'
import { documentSearchResponseSchema } from '../../../../shared/documents/contracts'
import { DocumentsActions } from '../../../../app/features/documents/model/actions/actions'
import { useDocumentsStore } from '../../../../app/features/documents/model/documents-state'

const result = [{
  id: '6aa8d3f3-5d50-4464-b9bc-283731a27383',
  title: 'Настройка API',
  excerpt: 'Для интеграции используются токены доступа.',
  updatedAt: '2026-07-14T10:00:00.000Z',
  publicationState: 'published',
}] as const

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
  vi.spyOn(documentsApi, 'search').mockResolvedValue(result)
})

describe('document search client', () => {
  it('validates the response, searches through stateless actions, and stores a copied projection', async () => {
    expect(documentSearchResponseSchema.parse(result)).toEqual(result)
    expect(() => documentSearchResponseSchema.parse([{ ...result[0], storagePath: '/private/file' }])).toThrow()

    const actions = new DocumentsActions()
    const store = useDocumentsStore()
    const response = await actions.search('project-1', 'токены')
    expect(response).toEqual(result)
    expect(documentsApi.search).toHaveBeenCalledWith('project-1', { query: 'токены' }, expect.anything())
    store.applySearchResults(response ?? [])
    expect(store.searchResults).toEqual(result)
    expect(store.searchResults).not.toBe(result)
  })

  it('renders a debounced accessible search field and result states on the documents page', async () => {
    const [view, results] = await Promise.all([
      readFile('app/features/documents/ui/DocumentsView.vue', 'utf8'),
      readFile('app/features/documents/ui/DocumentSearchResults.vue', 'utf8'),
    ])
    expect(view).toContain('watchDebounced')
    expect(view).toContain('<UiInputGroup>')
    expect(view).toContain('<UiInputGroupInput')
    expect(view).toContain('DOCUMENT_ACTION.SEARCH')
    expect(view).toContain('<DocumentSearchResults')
    expect(results).toContain(':to="`/projects/${projectId}/documents/${result.id}`"')
    expect(results).toContain('result.excerpt')
    expect(results).toContain('<UiEmpty')
  })

  it('uses POST with a no-store request body for potentially private search terms', async () => {
    vi.restoreAllMocks()
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(result))
    await expect(documentsApi.search('project-1', { query: 'токены' })).resolves.toEqual(result)
    expect($fetch).toHaveBeenCalledWith('/api/projects/project-1/documents/search', expect.objectContaining({
      method: 'POST',
      body: { query: 'токены' },
    }))
  })
})
