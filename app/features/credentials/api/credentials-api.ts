import type {
  ArchivedCredentialListResponse,
  CredentialCreateBody,
  CredentialIdResponse,
  CredentialListResponse,
  CredentialMutationResponse,
  CredentialRevealResponse,
  CredentialUpdateBody,
} from '../../../../shared/credentials/contracts'
import {
  archivedCredentialListResponseSchema,
  credentialIdResponseSchema,
  credentialListResponseSchema,
  credentialMutationResponseSchema,
  credentialRevealResponseSchema,
} from '../../../../shared/credentials/contracts'
import { decodeApiResponse } from '../../../shared/api/decode-api-response'

export const credentialsApi = {
  async load(projectId: string, query: string, signal: AbortSignal): Promise<CredentialListResponse> {
    const searching = query.trim().length > 0
    const response: unknown = searching
      ? await $fetch(`/api/projects/${projectId}/credentials/search`, { method: 'POST', body: { query }, signal })
      : await $fetch(`/api/projects/${projectId}/credentials`, { signal })
    return decodeApiResponse(
      credentialListResponseSchema,
      response,
      searching ? 'POST /api/projects/:projectId/credentials/search' : 'GET /api/projects/:projectId/credentials',
    )
  },
  async loadArchive(projectId: string, signal: AbortSignal): Promise<ArchivedCredentialListResponse> {
    const response: unknown = await $fetch(`/api/projects/${projectId}/credentials/archive`, { signal })
    return decodeApiResponse(archivedCredentialListResponseSchema, response, 'GET /api/projects/:projectId/credentials/archive')
  },
  async create(projectId: string, body: CredentialCreateBody, signal: AbortSignal): Promise<CredentialIdResponse> {
    const response: unknown = await $fetch(`/api/projects/${projectId}/credentials`, { method: 'POST', body, signal })
    return decodeApiResponse(credentialIdResponseSchema, response, 'POST /api/projects/:projectId/credentials')
  },
  async update(projectId: string, credentialId: string, body: CredentialUpdateBody, signal: AbortSignal): Promise<CredentialMutationResponse> {
    const response: unknown = await $fetch(`/api/projects/${projectId}/credentials/${credentialId}`, { method: 'PATCH', body, signal })
    return decodeApiResponse(credentialMutationResponseSchema, response, 'PATCH /api/projects/:projectId/credentials/:credentialId')
  },
  async reveal(projectId: string, credentialId: string, target: 'password', signal: AbortSignal): Promise<CredentialRevealResponse> {
    const response: unknown = await $fetch(`/api/projects/${projectId}/credentials/${credentialId}/reveal`, { method: 'POST', body: { target }, signal })
    return decodeApiResponse(credentialRevealResponseSchema, response, 'POST /api/projects/:projectId/credentials/:credentialId/reveal')
  },
  async archive(projectId: string, credentialId: string, signal: AbortSignal): Promise<CredentialMutationResponse> {
    const response: unknown = await $fetch(`/api/projects/${projectId}/credentials/${credentialId}`, { method: 'DELETE', signal })
    return decodeApiResponse(credentialMutationResponseSchema, response, 'DELETE /api/projects/:projectId/credentials/:credentialId')
  },
}
