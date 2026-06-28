import { expect, test, type Page } from '@playwright/test'

const oldPassword = 'Correct-Horse-Battery-1'
const newPassword = 'Different-Horse-Battery-2'

async function submitLogin(page: Page, identifier: string, password = oldPassword) {
  await page.goto('/auth')
  await page.locator('#email').fill(identifier)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Войти' }).click()
}

test('redirects a guest', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/auth$/)
})

test('signs in by email', async ({ page }) => {
  await submitLogin(page, 'user@example.com')
  await expect(page).toHaveURL(/\/$/)
})

test('signs in by username', async ({ page }) => {
  await submitLogin(page, 'test.user')
  await expect(page).toHaveURL(/\/$/)
})

test('hides credential enumeration', async ({ page }) => {
  await submitLogin(page, 'missing@example.com')
  const unknownMessage = await page.getByRole('alert').textContent()

  await submitLogin(page, 'user@example.com', 'Wrong-password-123')
  await expect(page.getByRole('alert')).toHaveText(unknownMessage ?? '')
})

test('revokes logout session', async ({ page }) => {
  await submitLogin(page, 'user@example.com')
  await expect(page).toHaveURL(/\/$/)

  const response = await page.request.post('/api/auth/sign-out', {
    data: {},
    headers: { origin: 'http://127.0.0.1:3000' },
  })
  expect(response.ok(), `${response.status()} ${await response.text()}`).toBe(true)
  await page.goto('/')
  await expect(page).toHaveURL(/\/auth$/)
})

test('returns one recovery response', async ({ page }) => {
  for (const email of ['user@example.com', 'missing@example.com']) {
    await page.goto('/auth/forgot-password')
    await page.locator('#email').fill(email)
    await page.getByRole('button', { name: 'Отправить ссылку' }).click()
    await expect(page.getByRole('status')).toHaveText(
      'Если аккаунт существует, ссылка отправлена на почту',
    )
  }
})

test('resets once through Mailpit', async ({ page }) => {
  const request = await page.request.post('/api/identity/request-password-reset', {
    data: { email: 'user@example.com' },
  })
  expect(request.ok()).toBe(true)
  const message = await fetch(
    `http://127.0.0.1:8025/view/latest.txt?query=${encodeURIComponent('to:user@example.com')}`,
  ).then(response => response.text())
  const token = message.match(/\/auth\/reset-password\/([^\s]+)/)?.[1]
  expect(token).toBeTruthy()

  await page.goto(`/auth/reset-password/${token}`)
  await page.locator('#new-password').fill(newPassword)
  await page.locator('#confirm-password').fill(newPassword)
  await page.getByRole('button', { name: 'Сохранить новый пароль' }).click()
  await expect(page).toHaveURL(/\/auth$/)

  await submitLogin(page, 'user@example.com', newPassword)
  await expect(page).toHaveURL(/\/$/)
})
