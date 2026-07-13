import { expect, test, type Page } from '@playwright/test'

const oldPassword = 'Correct-Horse-Battery-1'
const newPassword = 'Different-Horse-Battery-2'
const authenticatedUser = {
  email: 'user@example.com',
  name: 'Test.User',
} as const

async function submitLogin(page: Page, identifier: string, password = oldPassword) {
  await page.goto('/auth')
  await page.locator('#email').fill(identifier)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Войти' }).click()
}

test('redirects a guest', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/auth$/, { timeout: 30_000 })
})

test('blocks public authentication bypasses', async ({ request }) => {
  const headers = { origin: 'http://127.0.0.1:3000' }
  const signUp = await request.post('/api/auth/sign-up/email', {
    headers,
    data: {
      name: 'Public user',
      email: 'public@example.com',
      password: oldPassword,
    },
  })
  const availability = await request.post('/api/auth/is-username-available', {
    headers,
    data: { username: 'public.user' },
  })

  expect(signUp.status()).toBe(404)
  expect(availability.status()).toBe(404)
})

test('signs in by email', async ({ page }) => {
  await submitLogin(page, 'user@example.com')
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Страница в разработке' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Главная' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Проекты' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Настройки' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Администрирование' })).toHaveCount(0)

  await page.goto('/')
  await expect(page).toHaveURL(/\/dashboard$/)

  await page.goto('/projects/test-project/credentials')
  await expect(page).toHaveURL(/\/projects\/test-project\/credentials$/)
  await expect(page.getByRole('heading', { name: 'Учётные данные' })).toBeVisible()
  await expect(page.getByText('Не удалось загрузить категории').first()).toBeVisible()
  await expect(page.locator('input')).toHaveCount(0)
})

test('signs in by username', async ({ page }) => {
  await submitLogin(page, 'test.user')
  await expect(page).toHaveURL(/\/dashboard$/)
})

test('sidebar current user opens profile and revokes the session on logout', async ({ page }) => {
  await submitLogin(page, authenticatedUser.email)
  await expect(page).toHaveURL(/\/dashboard$/)

  const userMenu = page.getByRole('button', {
    name: `Меню пользователя ${authenticatedUser.name}`,
  })
  await expect(userMenu).toContainText(authenticatedUser.name)
  await expect(userMenu).toContainText(authenticatedUser.email)

  await userMenu.click()
  await page.getByRole('menuitem', { name: 'Профиль' }).click()
  await expect(page).toHaveURL(/\/settings\/profile$/)

  await userMenu.click()
  await page.getByRole('menuitem', { name: 'Выйти' }).click()
  await expect(page).toHaveURL(/\/auth$/)

  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/auth$/)
})

test('hides credential enumeration', async ({ page }) => {
  await submitLogin(page, 'missing@example.com')
  const unknownMessage = await page.getByRole('alert').textContent()

  await submitLogin(page, 'user@example.com', 'Wrong-password-123')
  await expect(page.getByRole('alert')).toHaveText(unknownMessage ?? '')
})

test('revokes logout session', async ({ page }) => {
  await submitLogin(page, 'user@example.com')
  await expect(page).toHaveURL(/\/dashboard$/)

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
    data: { email: 'recovery@example.com' },
  })
  expect(request.ok()).toBe(true)
  const message = await fetch(
    `http://127.0.0.1:8025/view/latest.txt?query=${encodeURIComponent('to:recovery@example.com')}`,
  ).then(response => response.text())
  const token = message.match(/\/auth\/reset-password\/([^\s]+)/)?.[1]
  expect(token).toBeTruthy()

  await page.goto(`/auth/reset-password/${token}`)
  await page.locator('#new-password').fill(newPassword)
  await page.locator('#confirm-password').fill(newPassword)
  await page.getByRole('button', { name: 'Сохранить новый пароль' }).click()
  await expect(page).toHaveURL(/\/auth$/)

  await submitLogin(page, 'recovery@example.com', newPassword)
  await expect(page).toHaveURL(/\/dashboard$/)
})
