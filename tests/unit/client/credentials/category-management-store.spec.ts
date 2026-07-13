import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCategoryManagementStore } from '../../../../app/features/credentials/model/category-management-state'
import type { CredentialCategoryManagement } from '../../../../shared/credentials/category-contracts'

const management: CredentialCategoryManagement = {
  canManage: true,
  canCreateCategories: true,
  canCreateCredentials: true,
  categories: [{
    id: 'category-1',
    name: 'Production',
    description: 'Servers',
    roleIds: ['role-1'],
    membershipIds: ['membership-1'],
  }],
  roles: [],
  members: [],
}

beforeEach(() => setActivePinia(createPinia()))

describe('category management Pinia store', () => {
  it('stores management projections and selects an editor draft', () => {
    const store = useCategoryManagementStore()

    store.apply(management)
    store.select('category-1')

    expect(store.categories).toEqual(management.categories)
    expect(store.name).toBe('Production')
    expect(store.roleIds).toEqual(['role-1'])
  })

  it('builds a save command from the category draft', () => {
    const store = useCategoryManagementStore()
    store.apply(management)
    store.select('category-1')
    store.name = ' Production API '

    expect(store.toSaveCommand()).toEqual({
      categoryId: 'category-1',
      body: { name: 'Production API', description: 'Servers' },
      grants: { roleIds: ['role-1'], membershipIds: ['membership-1'] },
    })
  })
})
