import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { parseOAuthConsentRequest } from '../../../../app/features/oauth-grants/model/consent-request'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

describe('OAuth consent UI', () => {
  it('accepts only the closed Minerva scope set from the signed authorization query', () => {
    expect(parseOAuthConsentRequest({
      client_id: 'desktop-ai',
      scope: 'projects:read documents:read',
      sig: 'signed-query',
    })).toEqual({ clientId: 'desktop-ai', scopes: ['projects:read', 'documents:read'] })

    expect(() => parseOAuthConsentRequest({ client_id: 'desktop-ai', scope: 'users:admin', sig: 'signed-query' })).toThrow()
    expect(() => parseOAuthConsentRequest({ client_id: 'desktop-ai', scope: 'documents:read' })).toThrow()
  })

  it('shows exact permissions and explicit allow and deny actions in Russian', async () => {
    const [page, view] = await Promise.all([
      read('../../../../app/pages/oauth/consent.vue'),
      read('../../../../app/features/oauth-grants/ui/OAuthConsentView.vue'),
    ])

    expect(page).toContain('<OAuthConsentView')
    expect(view).toContain('Запрашивает доступ к Minerva')
    expect(view).toContain('Разрешить')
    expect(view).toContain('Отказать')
    expect(view).toContain('oauthConsentApi.decide')
    expect(view).not.toContain('$fetch')
  })
})
