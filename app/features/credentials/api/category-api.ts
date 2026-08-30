import type {
  CredentialCategoryBody,
  CredentialCategoryGrantsBody,
  CredentialCategoryIdResponse,
  CredentialCategoryManagement,
  CredentialCategoryMutationResponse,
} from '../../../../shared/credentials/category-contracts'
import {
  credentialCategoryIdResponseSchema,
  credentialCategoryManagementSchema,
  credentialCategoryMutationResponseSchema,
} from '../../../../shared/credentials/category-contracts'
import { decodeApiResponse } from '../../../shared/api/decode-api-response'

export type CredentialCategoryApi = Readonly<{
  load: (projectId: string, signal: AbortSignal) => Promise<CredentialCategoryManagement>
  create: (projectId: string, body: CredentialCategoryBody, signal: AbortSignal) => Promise<CredentialCategoryIdResponse>
  update: (projectId: string, categoryId: string, body: CredentialCategoryBody, signal: AbortSignal) => Promise<CredentialCategoryMutationResponse>
  replaceGrants: (projectId: string, categoryId: string, body: CredentialCategoryGrantsBody, signal: AbortSignal) => Promise<CredentialCategoryMutationResponse>
  archive: (projectId: string, categoryId: string, signal: AbortSignal) => Promise<CredentialCategoryMutationResponse>
}>

export const categoryApi: CredentialCategoryApi = {
  load: async (projectId, signal) => {
    const response: unknown = await $fetch(`/api/projects/${projectId}/credential-categories`, { signal })
    return decodeApiResponse(credentialCategoryManagementSchema, response, 'GET /api/projects/:projectId/credential-categories')
  },
  create: async (projectId, body, signal) => {
    const response: unknown = await $fetch(`/api/projects/${projectId}/credential-categories`, { method: 'POST', body, signal })
    return decodeApiResponse(credentialCategoryIdResponseSchema, response, 'POST /api/projects/:projectId/credential-categories')
  },
  update: async (projectId, categoryId, body, signal) => {
    const response: unknown = await $fetch(`/api/projects/${projectId}/credential-categories/${categoryId}`, { method: 'PATCH', body, signal })
    return decodeApiResponse(credentialCategoryMutationResponseSchema, response, 'PATCH /api/projects/:projectId/credential-categories/:categoryId')
  },
  replaceGrants: async (projectId, categoryId, body, signal) => {
    const response: unknown = await $fetch(`/api/projects/${projectId}/credential-categories/${categoryId}/grants`, { method: 'PUT', body, signal })
    return decodeApiResponse(credentialCategoryMutationResponseSchema, response, 'PUT /api/projects/:projectId/credential-categories/:categoryId/grants')
  },
  archive: async (projectId, categoryId, signal) => {
    const response: unknown = await $fetch(`/api/projects/${projectId}/credential-categories/${categoryId}`, { method: 'DELETE', signal })
    return decodeApiResponse(credentialCategoryMutationResponseSchema, response, 'DELETE /api/projects/:projectId/credential-categories/:categoryId')
  },
}
