import { expect, test, type APIResponse } from '@playwright/test'

const requestId = '00000000-0000-4000-8000-000000000123'
const capability = 'abcdefghijklmnopqrstuvwxyzABCDEFGH123456789'
const id = '21b9fc31-6e20-4399-a2ea-fb4de1024821'

const expectDefensiveHeaders = (response: APIResponse): void => {
  const headers = response.headers()
  expect(headers['content-security-policy']).toContain("default-src 'self'")
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'")
  expect(headers['x-content-type-options']).toBe('nosniff')
  expect(headers['referrer-policy']).toBe('no-referrer')
  expect(headers['x-frame-options']).toBe('DENY')
  expect(headers['permissions-policy']).toContain('camera=()')
  expect(headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/u)
  expect(headers).not.toHaveProperty('strict-transport-security')
}

test('applies the transport boundary across every response family', async ({ request }) => {
  const responses = await Promise.all([
    request.get('/'),
    request.get('/api/health/live'),
    request.get('/api/mainMenu'),
    request.get(`/api/public/documentation/${capability}`),
    request.get(`/api/public/documentation/${capability}/images/${id}`),
    request.post(`/api/projects/${id}/ai-assistant/turn/stream`),
    request.post('/mcp'),
    request.get('/.well-known/oauth-protected-resource/mcp'),
  ])

  for (const response of responses) expectDefensiveHeaders(response)
})

test('propagates a valid request ID and replaces an invalid value', async ({ request }) => {
  const propagated = await request.get('/api/health/live', { headers: { 'x-request-id': requestId } })
  expect(propagated.headers()['x-request-id']).toBe(requestId)

  const replaced = await request.get('/api/health/live', { headers: { 'x-request-id': 'attacker-controlled' } })
  expect(replaced.headers()['x-request-id']).not.toBe('attacker-controlled')
  expect(replaced.headers()['x-request-id']).toMatch(/^[0-9a-f-]{36}$/u)
})

test('keeps the browser application executable under CSP', async ({ page }) => {
  const browserErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text())
  })
  await page.goto('/auth')
  await expect(page.locator('#email'), browserErrors.join('\n')).toBeVisible({ timeout: 30_000 })
})
