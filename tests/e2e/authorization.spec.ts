import { expect, test, type APIResponse, type Page } from '@playwright/test'

const password = 'Correct-Horse-Battery-1'
const publicOriginHeaders = { origin: 'http://127.0.0.1:3000' }

async function signIn(page: Page, identifier: string) {
  await page.goto('/auth')
  await page.locator('#email').fill(identifier)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page).toHaveURL(/\/projects$/)
}

async function expectSafeAuthorizationError(
  response: APIResponse,
  status: 401 | 403,
  code: 'AUTH_REQUIRED' | 'FORBIDDEN',
  rawPath: string,
) {
  const body = await response.text()

  expect(response.status()).toBe(status)
  expect(JSON.parse(body)).toEqual({ data: { code } })
  expect(body).not.toContain('stack')
  expect(body).not.toContain(rawPath)
}

test('keeps approved pages and readiness public', async ({ page, request }) => {
  const pages = [
    { path: '/auth', landmark: '#email' },
    { path: '/auth/forgot-password', landmark: '#email' },
    { path: '/auth/reset-password/token-shaped-value', landmark: '#new-password' },
    { path: '/invitations/token-shaped-value' },
    { path: '/legal/terms' },
    { path: '/legal/privacy' },
  ]

  for (const { path, landmark } of pages) {
    const response = await page.goto(path)
    expect(response, `${path} must return a document response`).not.toBeNull()
    expect(response?.ok(), `${path} returned ${response?.status()}`).toBe(true)
    await expect(page).toHaveURL(new RegExp(`${path.replaceAll('/', '\\/')}$`))
    if (landmark) await expect(page.locator(landmark)).toBeVisible({ timeout: 30_000 })
  }

  expect((await request.get('/api/health/database')).status()).toBe(200)
})

test('redirects a guest from a protected page', async ({ page }) => {
  await page.goto('/projects')
  await expect(page).toHaveURL(/\/auth$/, { timeout: 30_000 })
})

test('rejects a direct unauthenticated application API call without sensitive detail', async ({ request }) => {
  const response = await request.get('/api/mainMenu')
  await expectSafeAuthorizationError(response, 401, 'AUTH_REQUIRED', '/api/mainMenu')
})

test('requires authentication before administration authorization', async ({ request }) => {
  const response = await request.post('/api/administration/probe')
  await expectSafeAuthorizationError(response, 401, 'AUTH_REQUIRED', '/api/administration/probe')
})

test('rejects an ordinary user from an administration API', async ({ page }) => {
  await signIn(page, 'user@example.com')
  const response = await page.request.post('/api/administration/probe')
  await expectSafeAuthorizationError(response, 403, 'FORBIDDEN', '/api/administration/probe')
})

test('allows a super administrator through the administration guard', async ({ page }) => {
  await signIn(page, 'admin@example.com')
  const response = await page.request.post('/api/administration/probe')
  expect(response.status()).toBe(200)
  await expect(response.json()).resolves.toEqual({ probe: 'administration-authorized' })
})

test('keeps sign-in and recovery endpoints callable', async ({ request }) => {
  const signIn = await request.post('/api/identity/sign-in', {
    headers: publicOriginHeaders,
    data: { identifier: 'missing@example.com', password },
  })
  const recovery = await request.post('/api/identity/request-password-reset', {
    headers: publicOriginHeaders,
    data: { email: 'missing@example.com' },
  })

  expect(signIn.status()).toBe(401)
  await expect(signIn.json()).resolves.toMatchObject({
    data: { code: 'INVALID_CREDENTIALS' },
  })
  expect(recovery.status()).toBe(200)
})

test('redirects an ordinary user away from administration', async ({ page }) => {
  await signIn(page, 'user@example.com')
  await page.goto('/administration/users')
  await expect(page).toHaveURL(/\/projects$/)
})

test('allows the bootstrapped super administrator into administration', async ({ page }) => {
  await signIn(page, 'admin@example.com')
  await page.goto('/administration/users')
  await expect(page).toHaveURL(/\/administration\/users$/)
})
