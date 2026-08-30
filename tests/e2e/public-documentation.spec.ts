import { expect, test, type APIRequestContext } from '@playwright/test'
import { DOCUMENT_TEMPLATE } from '../../shared/documents/constants'
import { DOCUMENT_PUBLIC_SHARE_SCOPE } from '../../shared/documents/public-share-constants'
import { AUDIT_CHANNEL } from '../../shared/projects/constants'
import { archiveDocumentPersistence, archiveDocumentWith } from '../../server/modules/documents/document-archive'
import { createDocumentPersistence, createDocumentWith } from '../../server/modules/documents/create-document'
import { createDocumentPublicShareRepository } from '../../server/modules/documents/document-public-share-repository'
import { createDocumentPublicShareManagementService } from '../../server/modules/documents/document-public-shares'
import { publishDocumentPersistence, publishDocumentWith } from '../../server/modules/documents/document-versions'
import { createDocumentPublicShareCrypto } from '../../server/modules/documents/public-share-crypto'
import { updateDocumentDraftPersistence, updateDocumentDraftWith } from '../../server/modules/documents/update-document-draft'
import { createProjectPersistence } from '../../server/modules/projects/create-project'
import { createTestDatabase } from '../helpers/database'

interface Fixture {
  readonly actorUserId: string
  readonly projectId: string
  readonly rootId: string
  readonly childId: string
  readonly outsideId: string
  readonly branchShareId: string
  readonly branchToken: string
  readonly exactToken: string
}

const tokenFrom = (url: string): string => {
  const token = new URL(url).pathname.split('/').at(-1)
  if (!token) throw new Error('Public capability token is missing')
  return token
}

const createManagement = (database: ReturnType<typeof createTestDatabase>) =>
  createDocumentPublicShareManagementService({
    repository: createDocumentPublicShareRepository(database.db),
    crypto: createDocumentPublicShareCrypto({ activeVersion: 1, keys: new Map([[1, Buffer.alloc(32)]]) }),
    publicBaseUrl: 'http://127.0.0.1:3000/',
  })

const expectUnavailable = async (request: APIRequestContext, token: string): Promise<void> => {
  const response = await request.get(`/api/public/documentation/${token}`)
  expect(response.status()).toBe(404)
  const body = await response.text()
  expect(body).toContain('Documentation unavailable')
  expect(body).not.toContain('stack')
  expect(body).not.toContain(token)
}

test.describe.serial('public documentation release boundary', () => {
  let fixture: Fixture

  test.beforeAll(async () => {
    const database = createTestDatabase()
    try {
      const [actor] = await database.queryClient<{ id: string }[]>`
        select id from "user" where email = 'admin@example.com'
      `
      if (!actor) throw new Error('Public documentation E2E actor is missing')
      const project = await createProjectPersistence(database.db)({
        actorUserId: actor.id,
        channel: AUDIT_CHANNEL.WEB,
        name: 'Public Documentation E2E',
        description: null,
      })
      const create = createDocumentWith({ persist: createDocumentPersistence(database.db) })
      const createPage = async (title: string, parentId: string | null): Promise<string> => {
        const result = await create({
          actorUserId: actor.id,
          projectId: project.projectId,
          channel: AUDIT_CHANNEL.WEB,
          title,
          parentId,
          template: DOCUMENT_TEMPLATE.BLANK,
        })
        if (!result.ok) throw new Error(`Document fixture failed: ${result.code}`)
        return result.value.documentId
      }
      const rootId = await createPage('Public root', null)
      const childId = await createPage('Public child', rootId)
      const outsideId = await createPage('Private outside title', null)
      const update = updateDocumentDraftWith({ persist: updateDocumentDraftPersistence(database.db) })
      const rootDraft = await update({
        actorUserId: actor.id,
        projectId: project.projectId,
        documentId: rootId,
        channel: AUDIT_CHANNEL.WEB,
        title: 'Published root',
        expectedRevision: 0,
        content: {
          type: 'doc',
          content: [{
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Published body. ' },
              { type: 'text', text: 'Open child', marks: [{ type: 'link', attrs: { href: `document:${childId}` } }] },
              { type: 'text', text: ' Outside', marks: [{ type: 'link', attrs: { href: `document:${outsideId}` } }] },
            ],
          }],
        },
      })
      if (!rootDraft.ok) throw new Error(`Root draft fixture failed: ${rootDraft.code}`)
      const publish = publishDocumentWith({ publish: publishDocumentPersistence(database.db) })
      for (const [documentId, expectedRevision] of [[rootId, 1], [childId, 0], [outsideId, 0]] as const) {
        const result = await publish({ actorUserId: actor.id, projectId: project.projectId, documentId, channel: AUDIT_CHANNEL.WEB, expectedRevision })
        if (!result.ok) throw new Error(`Publish fixture failed: ${result.code}`)
      }
      const privateDraft = await update({
        actorUserId: actor.id,
        projectId: project.projectId,
        documentId: rootId,
        channel: AUDIT_CHANNEL.WEB,
        title: 'DRAFT SECRET TITLE',
        content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'DRAFT SECRET BODY' }] }] },
        expectedRevision: 1,
      })
      if (!privateDraft.ok) throw new Error(`Private draft fixture failed: ${privateDraft.code}`)

      const management = createManagement(database)
      const branch = await management.open({ projectId: project.projectId, rootDocumentId: rootId, actorUserId: actor.id, scope: DOCUMENT_PUBLIC_SHARE_SCOPE.BRANCH })
      const exact = await management.open({ projectId: project.projectId, rootDocumentId: rootId, actorUserId: actor.id, scope: DOCUMENT_PUBLIC_SHARE_SCOPE.DOCUMENT })
      if (!branch.ok || !exact.ok) throw new Error('Public share fixture failed')
      fixture = {
        actorUserId: actor.id,
        projectId: project.projectId,
        rootId,
        childId,
        outsideId,
        branchShareId: branch.value.share.id,
        branchToken: tokenFrom(branch.value.url),
        exactToken: tokenFrom(exact.value.url),
      }
    }
    finally {
      await database.close()
    }
  })

  test('serves only published in-scope JSON with defensive headers', async ({ request }) => {
    const response = await request.get(`/api/public/documentation/${fixture.branchToken}`)
    expect(response.status()).toBe(200)
    expect(response.headers()['cache-control']).toBe('no-store')
    expect(response.headers()['referrer-policy']).toBe('no-referrer')
    expect(response.headers()['x-robots-tag']).toBe('noindex, nofollow, noarchive')
    const body = await response.text()
    expect(body).toContain('Published root')
    expect(body).toContain('Public child')
    expect(body).not.toContain('DRAFT SECRET')
    expect(body).not.toContain('Private outside title')
    expect(body).not.toContain(fixture.branchToken)
    expect((await request.get(`/api/public/documentation/${fixture.exactToken}`)).status()).toBe(200)

    const escaped = await request.get(`/api/public/documentation/${fixture.branchToken}/pages/${fixture.outsideId}`)
    expect(escaped.status()).toBe(404)
    const image = await request.get(`/api/public/documentation/${fixture.branchToken}/images/${fixture.outsideId}`)
    expect(image.status()).toBe(404)
  })

  test('renders exact and branch scopes on desktop and mobile without private application chrome', async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto(`/share/documentation/${fixture.exactToken}`)
    await expect(page.getByRole('heading', { name: 'Published root' })).toBeVisible({ timeout: 60_000 })
    await expect(page.getByText('DRAFT SECRET BODY')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Навигация' })).toHaveCount(0)
    await expect(page.getByText('Open child')).toHaveClass(/line-through/u)
    await expect(page.getByRole('link', { name: 'Войти' })).toBeVisible()

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/share/documentation/${fixture.branchToken}`)
    await page.getByRole('button', { name: 'Навигация' }).click({ timeout: 60_000 })
    await expect(page.getByRole('heading', { name: 'Public Documentation E2E' })).toBeVisible()
    await page.locator('[role="dialog"]').getByRole('link', { name: 'Public child' }).click()
    await expect(page).toHaveURL(new RegExp(`${fixture.childId}$`, 'u'))
    await expect(page.getByRole('heading', { name: 'Public child' })).toBeVisible()
    await expect(page.locator('aside')).toBeHidden()
  })

  test('fails closed after rotation, revocation, and root archival', async ({ request }) => {
    const database = createTestDatabase()
    try {
      const management = createManagement(database)
      const rotated = await management.rotate({
        projectId: fixture.projectId,
        rootDocumentId: fixture.rootId,
        actorUserId: fixture.actorUserId,
        shareId: fixture.branchShareId,
      })
      if (!rotated.ok) throw new Error(`Rotation failed: ${rotated.code}`)
      const replacementToken = tokenFrom(rotated.value.url)
      await expectUnavailable(request, fixture.branchToken)
      expect((await request.get(`/api/public/documentation/${replacementToken}`)).status()).toBe(200)

      const race = await Promise.all([
        request.get(`/api/public/documentation/${replacementToken}`),
        management.revoke({
          projectId: fixture.projectId,
          rootDocumentId: fixture.rootId,
          actorUserId: fixture.actorUserId,
          shareId: rotated.value.share.id,
        }),
      ])
      expect([200, 404]).toContain(race[0].status())
      expect(race[1].ok).toBe(true)
      await expectUnavailable(request, replacementToken)

      const archived = await archiveDocumentWith({ archive: archiveDocumentPersistence(database.db) })({
        actorUserId: fixture.actorUserId,
        projectId: fixture.projectId,
        documentId: fixture.rootId,
        channel: AUDIT_CHANNEL.WEB,
      })
      expect(archived.ok).toBe(true)
      await expectUnavailable(request, fixture.exactToken)
    }
    finally {
      await database.close()
    }
  })
})
