import { readFile } from 'node:fs/promises'

import { describe, expect, it } from 'vitest'

describe('transport integration boundary', () => {
  it('applies security headers globally and keeps HSTS at Caddy', async () => {
    const middleware = await readFile('server/middleware/00.security.ts', 'utf8')
    const caddy = await readFile('deploy/Caddyfile', 'utf8')

    expect(middleware).toContain('HTTP_SECURITY_HEADERS')
    expect(caddy).toContain('Strict-Transport-Security')
    expect(caddy).not.toMatch(/^\s*log\s*(\{|$)/mu)
  })

  it('logs through a closed request plugin without reading sensitive request fields', async () => {
    const plugin = await readFile('server/plugins/request-observability.ts', 'utf8')

    expect(plugin).toContain("hook('request'")
    expect(plugin).toContain("hook('afterResponse'")
    expect(plugin).toContain("hook('error'")
    expect(plugin).not.toMatch(/authorization|cookie|readBody|getHeaders|getRequestHeaders|event\.path|event\.node\.req\.url/iu)
  })

  it('selects secure Better Auth cookies from the canonical HTTPS base URL', async () => {
    const auth = await readFile('server/modules/identity/auth/create-auth.ts', 'utf8')

    expect(auth).toContain("useSecureCookies: new URL(baseURL).protocol === 'https:'")
  })
})
