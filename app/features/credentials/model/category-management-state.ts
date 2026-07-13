import { defineStore } from 'pinia'
import type { CredentialCategoryBody, CredentialCategoryGrantsBody, CredentialCategoryManagement } from '../../../../shared/credentials/category-contracts'

export type CategorySaveCommand = Readonly<{
  categoryId: string | null
  body: CredentialCategoryBody
  grants: CredentialCategoryGrantsBody | null
}>

interface CategoryManagementState {
  data: CredentialCategoryManagement
  selectedId: string | null
  name: string
  description: string
  roleIds: string[]
  membershipIds: string[]
}

export const useCategoryManagementStore = defineStore('credential-categories', {
  state: (): CategoryManagementState => ({
    data: {
      canManage: false,
      canCreateCategories: false,
      canCreateCredentials: false,
      categories: [],
      roles: [],
      members: [],
    },
    selectedId: null,
    name: '',
    description: '',
    roleIds: [],
    membershipIds: [],
  }),

  getters: {
    categories: state => state.data.categories,
    roles: state => state.data.roles,
    members: state => state.data.members,
    canManage: state => state.data.canManage,
    canCreateCategories: state => state.data.canCreateCategories,
    canCreateCredentials: state => state.data.canCreateCredentials,
  },

  actions: {
    apply(value: CredentialCategoryManagement): void {
      this.data = value
    },

    select(categoryId: string | null): void {
      this.selectedId = categoryId
      const category = this.data.categories.find(item => item.id === categoryId)
      this.name = category?.name ?? ''
      this.description = category?.description ?? ''
      this.roleIds = [...(category?.roleIds ?? [])]
      this.membershipIds = [...(category?.membershipIds ?? [])]
    },

    toSaveCommand(): CategorySaveCommand | null {
      const normalizedName = this.name.trim()
      if (!normalizedName) {
        return null
      }

      return {
        categoryId: this.selectedId,
        body: {
          name: normalizedName,
          description: this.description.trim() || null,
        },
        grants: this.data.canManage
          ? { roleIds: [...this.roleIds], membershipIds: [...this.membershipIds] }
          : null,
      }
    },
  },
})
