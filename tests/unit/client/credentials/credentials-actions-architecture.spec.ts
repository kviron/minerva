import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

describe('credentials feature actions architecture', () => {
  it('declares separate entity actions through BaseActions and a feature provider', async () => {
    const [actions, categoryActions, provider, view, store] = await Promise.all([
      read('../../../../app/features/credentials/model/actions/actions.ts'),
      read('../../../../app/features/credentials/model/actions/category-actions.ts'),
      read('../../../../app/features/credentials/model/actions/provider.ts'),
      read('../../../../app/features/credentials/ui/CredentialsProvider.vue'),
      read('../../../../app/features/credentials/model/credentials-state.ts'),
    ])
    expect(actions).toContain('export class CredentialsActions extends BaseActions')
    expect(actions).not.toContain('categoryApi')
    expect(actions).not.toContain('CategoryManagementState')
    expect(actions).not.toContain('CredentialsState')
    expect(actions).not.toContain('this.state')
    expect(actions).not.toContain("from 'pinia'")
    expect(categoryActions).toContain('export class CredentialCategoryActions extends BaseActions')
    expect(categoryActions).not.toContain('credentialsApi')
    expect(categoryActions).not.toContain('CredentialsState')
    expect(categoryActions).not.toContain('CategoryManagementState')
    expect(categoryActions).not.toContain('this.state')
    expect(categoryActions).not.toContain("from 'pinia'")
    expect(actions).toContain('this.createAsyncAction')
    expect(provider).toContain('provideCredentialsActions')
    expect(provider).toContain('useCredentialsActions')
    expect(provider).not.toContain('CredentialsState')
    expect(view).not.toContain('provideCredentialsState')
    expect(view).not.toContain('createCredentialsState')
    expect(store).toContain("defineStore('credentials'")
    expect(provider).toContain('useCredentialCategoryActions')
    expect(provider).not.toContain('CategoryManagementState')
    expect(view).not.toContain('provideCategoryManagementState')
    expect(view).not.toContain('createCategoryManagementState')
    expect(store).toContain("defineStore('credentials'")
    const categoryStore = await read('../../../../app/features/credentials/model/category-management-state.ts')
    expect(categoryStore).toContain("defineStore('credential-categories'")
    expect(view).toContain('provideCredentialsActions(credentialsActions)')
    expect(view).toContain('provideCredentialCategoryActions(categoryActions)')
  })

  it('keeps API effects out of state models and child UI', async () => {
    const sources = await Promise.all([
      read('../../../../app/features/credentials/model/category-management-state.ts'),
      read('../../../../app/features/credentials/model/credentials-state.ts'),
      read('../../../../app/features/credentials/ui/CategoryManagementSheet.vue'),
      read('../../../../app/features/credentials/ui/CredentialEditorSheet.vue'),
      read('../../../../app/features/credentials/ui/CredentialsTable.vue'),
    ])
    for (const source of sources) {
      expect(source).not.toContain("../api/")
      expect(source).not.toContain('$fetch')
    }
    expect(sources[2]).toContain('useCredentialCategoryActions()')
    expect(sources.slice(3).every(source => source.includes('useCredentialsActions()'))).toBe(true)
  })
})
