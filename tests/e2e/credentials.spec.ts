import { expect, test, type Page } from '@playwright/test'
import { createTestDatabase } from '../helpers/database'
import { AUTHORIZATION_API_TEST_USER } from './fixtures/users'

const password = 'Correct-Horse-Battery-1'

async function signIn(page: Page, email: string) {
  await page.goto('/auth')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

async function signOut(page: Page) {
  await page.context().clearCookies()
}

async function fixtureIds() {
  const database = createTestDatabase()
  try {
    const projects = await database.queryClient<{ id: string, name: string }[]>`
      select id, name from projects where name in ('Credentials E2E', 'Credentials E2E Foreign')
    `
    return {
      projectId: projects.find(item => item.name === 'Credentials E2E')!.id,
      foreignProjectId: projects.find(item => item.name === 'Credentials E2E Foreign')!.id,
    }
  }
  finally { await database.close() }
}

test('enforces the complete credential access journey', async ({ page }) => {
  test.setTimeout(90_000)
  const { projectId, foreignProjectId } = await fixtureIds()
  await signIn(page, 'admin@example.com')
  await page.goto(`/projects/${projectId}/credentials`)

  await page.getByRole('button', { name: 'Создать категорию' }).click()
  await page.locator('#category-name').fill('Продакшен E2E')
  await page.getByLabel('Viewer').click({ force: true })
  await Promise.all([
    page.waitForResponse(response => response.url().includes('/credential-categories') && response.request().method() === 'POST'),
    page.getByRole('button', { name: 'Сохранить' }).click(),
  ])
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Новая учётная запись' }).first().click()
  await page.locator('#credential-title').fill('Панель E2E')
  await page.locator('#credential-login').fill('e2e-admin')
  await page.locator('#credential-password').fill('e2e-secret-password')
  await page.getByRole('button', { name: 'Сохранить' }).click()
  await expect(page.getByRole('cell', { name: 'Панель E2E', exact: true })).toBeVisible()

  const list = await page.request.get(`/api/projects/${projectId}/credentials`)
  expect(list.status()).toBe(200)
  const [credential] = await list.json() as Array<{ id: string }>
  const reveal = await page.request.post(`/api/projects/${projectId}/credentials/${credential!.id}/reveal`, { data: { target: 'password' } })
  expect(reveal.status()).toBe(200)
  expect(reveal.headers()['cache-control']).toContain('no-store')
  await expect(reveal.json()).resolves.toEqual({ value: 'e2e-secret-password' })

  await signOut(page)
  await signIn(page, AUTHORIZATION_API_TEST_USER.email)
  expect((await page.request.get(`/api/projects/${projectId}/credentials`)).status()).toBe(200)
  const deniedMutation = await page.request.patch(`/api/projects/${projectId}/credentials/${credential!.id}`, {
    data: { categoryId: '00000000-0000-0000-0000-000000000000', title: 'Denied', login: { kind: 'keep' }, password: { kind: 'keep' }, fields: [] },
  })
  expect(deniedMutation.status()).toBe(404)

  await signOut(page)
  await signIn(page, 'admin@example.com')
  await page.goto(`/projects/${projectId}/credentials`)
  await page.getByRole('button', { name: 'Управление категориями' }).click()
  await page.getByRole('button', { name: 'Продакшен E2E' }).click()
  await page.getByLabel('Viewer').click({ force: true })
  await Promise.all([
    page.waitForResponse(response => response.url().includes('/grants') && response.request().method() === 'PUT'),
    page.getByRole('button', { name: 'Сохранить' }).click(),
  ])

  const crossProject = await page.request.post(`/api/projects/${foreignProjectId}/credentials/${credential!.id}/reveal`, { data: { target: 'password' } })
  expect(crossProject.status()).toBe(404)

  await signOut(page)
  await signIn(page, AUTHORIZATION_API_TEST_USER.email)
  const revokedList = await page.request.get(`/api/projects/${projectId}/credentials`)
  expect(revokedList.status()).toBe(200)
  await expect(revokedList.json()).resolves.toEqual([])
  expect((await page.request.post(`/api/projects/${projectId}/credentials/${credential!.id}/reveal`, { data: { target: 'password' } })).status()).toBe(404)
})
