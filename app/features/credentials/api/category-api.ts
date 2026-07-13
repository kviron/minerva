import type {
  CredentialCategoryBody,
  CredentialCategoryGrantsBody,
  CredentialCategoryIdResponse,
  CredentialCategoryManagement,
  CredentialCategoryMutationResponse,
} from '../../../../shared/credentials/category-contracts'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === 'string')
const invalidResponse = () => new Error('Invalid credential category response')

export function parseCategoryManagement(value: unknown): CredentialCategoryManagement {
  if (!isRecord(value) || typeof value.canManage !== 'boolean' || typeof value.canCreateCategories !== 'boolean'
    || typeof value.canCreateCredentials !== 'boolean'
    || !Array.isArray(value.categories) || !Array.isArray(value.roles) || !Array.isArray(value.members))
  {
    throw invalidResponse()
  }
  const categories = value.categories.map((item) => {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.name !== 'string'
      || !(item.description === null || typeof item.description === 'string')
      || !isStringArray(item.roleIds) || !isStringArray(item.membershipIds)) {
      throw invalidResponse()
    }
    return { id: item.id, name: item.name, description: item.description, roleIds: item.roleIds, membershipIds: item.membershipIds }
  })
  const roles = value.roles.map((item) => {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.name !== 'string'
      || !(item.builtInKey === null || item.builtInKey === 'admin' || item.builtInKey === 'editor' || item.builtInKey === 'viewer')) {
      throw invalidResponse()
    }
    const builtInKey: 'admin' | 'editor' | 'viewer' | null = item.builtInKey
    return { id: item.id, name: item.name, builtInKey }
  })
  const members = value.members.map((item) => {
    if (!isRecord(item) || typeof item.membershipId !== 'string' || typeof item.userId !== 'string'
      || typeof item.name !== 'string' || typeof item.email !== 'string') {
      throw invalidResponse()
    }
    return { membershipId: item.membershipId, userId: item.userId, name: item.name, email: item.email }
  })
  return {
    canManage: value.canManage,
    canCreateCategories: value.canCreateCategories,
    canCreateCredentials: value.canCreateCredentials,
    categories, roles, members,
  }
}

export function parseCategoryIdResponse(value: unknown): CredentialCategoryIdResponse {
  if (!isRecord(value) || typeof value.categoryId !== 'string') {
    throw invalidResponse()
  }
  return { categoryId: value.categoryId }
}

export function parseCategoryMutationResponse(value: unknown): CredentialCategoryMutationResponse {
  if (!isRecord(value) || value.ok !== true) {
    throw invalidResponse()
  }
  return { ok: true }
}

export type CredentialCategoryApi = Readonly<{
  load: (projectId: string, signal: AbortSignal) => Promise<CredentialCategoryManagement>
  create: (projectId: string, body: CredentialCategoryBody, signal: AbortSignal) => Promise<CredentialCategoryIdResponse>
  update: (projectId: string, categoryId: string, body: CredentialCategoryBody, signal: AbortSignal) => Promise<CredentialCategoryMutationResponse>
  replaceGrants: (projectId: string, categoryId: string, body: CredentialCategoryGrantsBody, signal: AbortSignal) => Promise<CredentialCategoryMutationResponse>
  archive: (projectId: string, categoryId: string, signal: AbortSignal) => Promise<CredentialCategoryMutationResponse>
}>

export const categoryApi: CredentialCategoryApi = {
  load: async (projectId, signal) =>
    parseCategoryManagement(await $fetch(`/api/projects/${projectId}/credential-categories`, { signal })),
  create: async (projectId, body, signal) => parseCategoryIdResponse(
    await $fetch(`/api/projects/${projectId}/credential-categories`, { method: 'POST', body, signal }),
  ),
  update: async (projectId, categoryId, body, signal) => parseCategoryMutationResponse(
    await $fetch(`/api/projects/${projectId}/credential-categories/${categoryId}`, { method: 'PATCH', body, signal }),
  ),
  replaceGrants: async (projectId, categoryId, body, signal) => parseCategoryMutationResponse(
    await $fetch(`/api/projects/${projectId}/credential-categories/${categoryId}/grants`, { method: 'PUT', body, signal }),
  ),
  archive: async (projectId, categoryId, signal) => parseCategoryMutationResponse(
    await $fetch(`/api/projects/${projectId}/credential-categories/${categoryId}`, { method: 'DELETE', signal }),
  ),
}
