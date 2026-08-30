import { expect, test, type Page } from '@playwright/test'
import { createTestDatabase } from '../helpers/database'

const password = 'Correct-Horse-Battery-1'
const documentId = '31b9fc31-6e20-4399-a2ea-fb4de1024821'

async function signIn(page: Page) {
  await page.goto('/auth')
  await page.locator('#email').fill('admin@example.com')
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page).toHaveURL(/\/dashboard$/u)
}

async function projectId() {
  const database = createTestDatabase()
  try {
    const [project] = await database.queryClient<{ id: string }[]>`
      select id from projects where name = 'Credentials E2E'
    `
    if (!project) throw new Error('AI assistant E2E project is missing')
    return project.id
  }
  finally {
    await database.close()
  }
}

test('opens the project-wide assistant and renders a streamed cited answer', async ({ page }) => {
  test.setTimeout(90_000)
  const currentProjectId = await projectId()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route(`**/api/projects/${currentProjectId}/ai-assistant/availability`, route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ availability: 'ready' }),
  }))
  await page.route(`**/api/projects/${currentProjectId}/ai-assistant/turn/stream`, async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      question: 'Как проверяются права?',
      conversationId: expect.stringMatching(/^[0-9a-f-]{36}$/u),
    })
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: { 'Cache-Control': 'private, no-store' },
      body: [
        `event: context\ndata: {"type":"context","citations":[{"documentId":"${documentId}","title":"Авторизация"}]}\n\n`,
        'event: delta\ndata: {"type":"delta","delta":"Права проверяются "}\n\n',
        'event: delta\ndata: {"type":"delta","delta":"на сервере."}\n\n',
        `event: completed\ndata: {"type":"completed","citations":[{"documentId":"${documentId}","title":"Авторизация"}],"usage":{"inputTokens":42,"outputTokens":7}}\n\n`,
      ].join(''),
    })
  })

  await signIn(page)
  await page.goto(`/projects/${currentProjectId}`)
  await page.getByRole('button', { name: 'Открыть AI-помощника' }).click()

  await expect(page.getByRole('heading', { name: 'AI-помощник' })).toBeVisible()
  const composer = page.getByLabel('Вопрос AI-помощнику')
  await expect(composer).toBeFocused()
  await composer.fill('Как проверяются права?')
  await composer.press('Enter')

  await expect(page.getByText('Права проверяются на сервере.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Авторизация' })).toHaveAttribute(
    'href',
    `/projects/${currentProjectId}/documents/${documentId}`,
  )
})
