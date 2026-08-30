import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { readFile } from 'node:fs/promises'
import { InvalidApiResponseError } from '../../../../app/shared/api/decode-api-response'
import { publicDocumentationApi } from '../../../../app/features/public-documentation/api/public-documentation-api'
import { publicDocumentImageUrl, publicDocumentRoute } from '../../../../app/features/public-documentation/model/public-documentation-links'
import { usePublicDocumentationStore } from '../../../../app/features/public-documentation/model/public-documentation-state'

const token = 'abcdefghijklmnopqrstuvwxyzABCDEFGH123456789'
const documentId = '21b9fc31-6e20-4399-a2ea-fb4de1024821'
const response = {
  scope: 'document', rootDocumentId: documentId, projectName: 'Minerva', tree: [],
  page: { id: documentId, title: 'Введение', slug: 'intro', content: { type: 'doc', content: [] }, publishedAt: '2026-08-02T10:00:00.000Z', internalLinks: [] },
} as const

beforeEach(() => {
  setActivePinia(createPinia())
  vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(response))
})

describe('public documentation client boundary', () => {
  it('aligns branch content with the navigation column while keeping standalone pages centered', async () => {
    const view = await readFile('app/features/public-documentation/ui/PublicDocumentationView.vue', 'utf8')

    expect(view).toContain("hasNavigation ? 'min-w-0 max-w-4xl' : 'mx-auto min-w-0 max-w-4xl'")
  })

  it('loads a root or selected public page through distinct endpoints', async () => {
    await publicDocumentationApi.read(token)
    await publicDocumentationApi.read(token, documentId)
    expect($fetch).toHaveBeenNthCalledWith(1, `/api/public/documentation/${token}`, { signal: undefined })
    expect($fetch).toHaveBeenNthCalledWith(2, `/api/public/documentation/${token}/pages/${documentId}`, { signal: undefined })
  })

  it('rejects unexpected fields at the untrusted HTTP boundary', async () => {
    vi.mocked($fetch).mockResolvedValueOnce({ ...response, draft: true })
    await expect(publicDocumentationApi.read(token)).rejects.toBeInstanceOf(InvalidApiResponseError)
  })

  it('builds only guest routes and token-scoped image URLs', () => {
    expect(publicDocumentRoute(token, documentId)).toBe(`/share/documentation/${token}/${documentId}`)
    expect(publicDocumentImageUrl(token, documentId)).toBe(`/api/public/documentation/${token}/images/${documentId}`)
  })

  it('stores the decoded projection without retaining the capability token', () => {
    const store = usePublicDocumentationStore()
    store.apply(response)
    expect(store.documentation?.page.title).toBe('Введение')
    expect(JSON.stringify(store.$state)).not.toContain(token)
  })
})
