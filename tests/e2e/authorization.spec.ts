import { expect, test, type Page } from '@playwright/test'

const password = 'Correct-Horse-Battery-1'
const publicOriginHeaders = { origin: 'http://127.0.0.1:3000' }

async function signIn(page: Page, identifier: string) {
  await page.goto('/auth')
  await page.locator('#email').fill(identifier)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page).toHaveURL(/\/projects$/)
}

test('keeps approved pages and readiness public', async ({ page, request }) => {
  const paths = [
    '/auth',
    '/auth/forgot-password',
    '/auth/reset-password/token-shaped-value',
    '/invitations/token-shaped-value',
    '/legal/terms',
    '/legal/privacy',
  ]

  for (const path of paths) {
    await page.goto(path)
    await expect(page).toHaveURL(new RegExp(`${path.replaceAll('/', '\\/')}$`))
  }

  expect((await request.get('/api/health/database')).status()).toBe(200)
})

test('redirects a guest from a protected page', async ({ page }) => {
  await page.goto('/projects')
  await expect(page).toHaveURL(/\/auth$/, { timeout: 30_000 })
})

test('rejects a direct unauthenticated application API call without sensitive detail', async ({ request }) => {
  const response = await request.get('/api/mainMenu')
  const body = await response.text()

  expect(response.status()).toBe(401)
  expect(body).not.toContain('mainMenu')
  expect(body).not.toContain('database')
  expect(body).not.toContain('stack')
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
