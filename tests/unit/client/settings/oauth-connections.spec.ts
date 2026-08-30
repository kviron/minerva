import { readFile } from 'node:fs/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { oauthGrantsApi } from '../../../../app/features/oauth-grants/api/oauth-grants-api'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')
const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('$fetch', fetchMock)
})

describe('OAuth connections settings', () => {
  it('validates the safe grant projection and rejects token material', async () => {
    const grant = {
      id: '00000000-0000-4000-8000-000000000053',
      client: { id: 'desktop-ai', name: 'Desktop AI' },
      resource: 'https://minerva.example/mcp',
      scopes: ['documents:read'],
      createdAt: '2026-07-14T12:00:00.000Z',
      updatedAt: '2026-07-14T12:00:00.000Z',
    }
    fetchMock.mockResolvedValueOnce([grant]).mockResolvedValueOnce([{ ...grant, accessToken: 'secret' }])

    await expect(oauthGrantsApi.list()).resolves.toEqual([grant])
    await expect(oauthGrantsApi.list()).rejects.toThrow('Invalid API response: GET /api/oauth/grants')
  })

  it('renders Russian-first connection management with explicit revocation', async () => {
    const [view, page, feature] = await Promise.all([
      read('../../../../app/features/oauth-grants/ui/OAuthConnectionsView.vue'),
      read('../../../../app/pages/settings/connections.vue'),
      read('../../../../app/features/oauth-grants/index.ts'),
    ])

    expect(view).toContain('Подключённые приложения')
    expect(view).toContain('Отозвать доступ')
    expect(view).toContain('oauthGrantsApi.revoke')
    expect(page).toContain('<OAuthConnectionsView />')
    expect(feature).toContain("./ui/OAuthConnectionsView.vue")
  })
})
