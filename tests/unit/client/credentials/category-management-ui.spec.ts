import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

describe('credential category management UI', () => {
  it('replaces the credentials placeholder through the feature public boundary', async () => {
    const [page, publicApi] = await Promise.all([
      read('../../../../app/pages/projects/[id]/credentials/index.vue'),
      read('../../../../app/features/credentials/index.ts'),
    ])
    expect(page).toContain("from '@/features/credentials'")
    expect(page).toContain('<CredentialsProvider :project-id="projectId">')
    expect(page).toContain('<CredentialsView />')
    expect(page).not.toContain('AppPagePlaceholder')
    expect(publicApi).toContain("export { default as CredentialsView } from './ui/CredentialsView.vue'")
    expect(publicApi).toContain("export { default as CredentialsProvider } from './ui/CredentialsProvider.vue'")
  })

  it('uses Empty and a titled Sheet with Field composition and role/member grants', async () => {
    const [view, sheet] = await Promise.all([
      read('../../../../app/features/credentials/ui/CredentialsView.vue'),
      read('../../../../app/features/credentials/ui/CategoryManagementSheet.vue'),
    ])
    expect(view).toContain('<UiEmpty')
    expect(view).toContain('Категорий пока нет')
    expect(view).toContain('Создать категорию')
    expect(view).toContain('<CategoryManagementSheet')
    expect(sheet).toContain('<UiSheetTitle>Управление категориями</UiSheetTitle>')
    expect(sheet).toContain('<UiFieldGroup>')
    expect(sheet).toContain('v-for="role in state.roles"')
    expect(sheet).toContain('v-for="member in state.members"')
    expect(sheet).toContain('<UiCheckbox')
    expect(sheet).toContain('Администраторы проекта всегда имеют доступ')
    expect(sheet).toContain('Архивировать категорию')
  })

  it('uses strict project-scoped API adapters and safe errors', async () => {
    const api = await read('../../../../app/features/credentials/api/category-api.ts')
    const actions = await read('../../../../app/features/credentials/model/actions/category-actions.ts')
    expect(api).toContain('/api/projects/${projectId}/credential-categories')
    expect(api).toContain('decodeApiResponse')
    expect(api).toContain('credentialCategoryManagementSchema')
    expect(actions).not.toContain('error.message')
    expect(actions).toContain('createAsyncAction({')
  })

  it('gates category creation independently from access management', async () => {
    const [contract, view, state] = await Promise.all([
      read('../../../../shared/credentials/category-contracts.ts'),
      read('../../../../app/features/credentials/ui/CredentialsView.vue'),
      read('../../../../app/features/credentials/model/category-management-state.ts'),
    ])
    expect(contract).toContain('canCreateCategories: z.boolean()')
    expect(view).toContain('state.canCreateCategories')
    expect(state).toContain('grants: this.data.canManage')
  })
})
