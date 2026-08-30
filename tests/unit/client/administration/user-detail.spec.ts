import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { administrationUserDetailSchema } from '../../../../shared/administration/contracts'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')
const userId = '21b9fc31-6e20-4399-a2ea-fb4de1024821'

describe('administration user detail', () => {
  it('accepts only the safe user projection', () => {
    expect(administrationUserDetailSchema.parse({
      id: userId,
      name: 'Администратор',
      email: 'admin@example.com',
      username: 'admin',
      status: 'active',
      superAdmin: true,
      createdAt: '2026-07-10T10:00:00.000Z',
      lastLoginAt: null,
    })).toMatchObject({ id: userId, email: 'admin@example.com' })

    expect(() => administrationUserDetailSchema.parse({
      id: userId,
      password: 'private',
    })).toThrow()
  })

  it('opens the detail page from every users-table row', async () => {
    const table = await read('../../../../app/features/administration/ui/AdministrationUsersTable.vue')

    expect(table).toContain('const router = useRouter()')
    expect(table).toContain('const openUser = (userId: string) => router.push(`/administration/users/${userId}`)')
    expect(table).toContain('cursor-pointer')
    expect(table).toContain('@click="openUser(user.id)"')
    expect(table).toContain('@keydown.enter.prevent="openUser(user.id)"')
    expect(table).toContain('@keydown.space.prevent="openUser(user.id)"')
  })

  it('keeps the detail route and endpoint super-admin protected', async () => {
    const [listPage, page, endpoint, view] = await Promise.all([
      read('../../../../app/pages/administration/users/index.vue'),
      read('../../../../app/pages/administration/users/[id].vue'),
      read('../../../../server/api/administration/users/[id].get.ts'),
      read('../../../../app/features/administration/ui/AdministrationUserDetailView.vue'),
    ])

    expect(listPage).toContain('<AdministrationUsersView />')
    expect(page).toContain('<AdministrationTabs active="users" />')
    expect(page).toContain('<AdministrationUserDetailView :user-id="userId" />')
    expect(endpoint).toContain('await requireSuperAdmin(event)')
    expect(endpoint).toContain('getAdministrationUser')
    expect(endpoint).toContain('getValidatedRouterParams')
    expect(endpoint).toContain('administrationUserRouteParamsSchema')
    expect(endpoint).toContain("'Cache-Control', 'private, no-store'")
    expect(endpoint).toContain('statusCode: 404')
    expect(view).toContain('<UiCard>')
    expect(view).not.toMatch(/password|token|account|session|disabledReason/)
  })
})
