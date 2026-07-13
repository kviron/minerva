import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

describe('administration users page', () => {
  it('renders the users view under the active administration tab', async () => {
    const page = await read('../../../../app/pages/administration/users/index.vue')

    expect(page).toContain('<AdministrationTabs active="users" />')
    expect(page).toContain('<AdministrationUsersView />')
    expect(page).toContain("from '@/features/administration'")
  })

  it('uses Table, Empty, Skeleton, and the shared Empty-style error state', async () => {
    const [view, table, empty, error] = await Promise.all([
      read('../../../../app/features/administration/ui/AdministrationUsersView.vue'),
      read('../../../../app/features/administration/ui/AdministrationUsersTable.vue'),
      read('../../../../app/features/administration/ui/AdministrationUsersEmpty.vue'),
      read('../../../../app/features/administration/ui/AdministrationUsersLoadError.vue'),
    ])

    expect(view).toContain('<div class="flex flex-col gap-4 px-4 lg:px-6">')
    expect(view).not.toMatch(/<div class="flex flex-col[^\"]*\bpy-/)
    expect(view).toContain('<AdministrationUsersTableSkeleton v-if="pending" />')
    expect(view).toContain('<AdministrationUsersLoadError v-else-if="error"')
    expect(view).toContain('<AdministrationUsersEmpty v-else-if="users.length === 0" />')
    expect(view).toContain('<AdministrationUsersTable v-else :users="users" />')
    expect(table).toContain('<UiTable>')
    expect(table).toContain('Пользователь')
    expect(table).toContain('<UiTableHead>Email</UiTableHead>')
    expect(table).toContain('<UiTableCell class="font-medium">{{ user.name }}</UiTableCell>')
    expect(table).toContain('<UiTableCell class="text-muted-foreground">{{ user.email }}</UiTableCell>')
    expect(table).not.toContain('flex flex-col gap-0.5')
    expect(table).toContain('Последний вход')
    expect(empty).toContain('<UiEmpty')
    expect(error).toContain('<UiEmpty role="alert"')
    expect(error).toContain('Обновить')
  })

  it('keeps authorization and the exact projection on the server', async () => {
    const [endpoint, query] = await Promise.all([
      read('../../../../server/api/administration/users.get.ts'),
      read('../../../../server/modules/administration/list-users.ts'),
    ])

    expect(endpoint).toContain('await requireSuperAdmin(event)')
    expect(endpoint).toContain('return listAllUsers()')
    expect(query).toContain('.from(user)')
    expect(query).not.toMatch(/\baccount\b|\bsession\b|password|token|disabledReason/)
  })
})
