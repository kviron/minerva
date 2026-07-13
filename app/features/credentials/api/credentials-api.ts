import type { MaskedCredentialListItem } from '../../../../shared/credentials/contracts'
import type { CredentialFieldType } from '../../../../shared/credentials/types'
import type { CredentialCreateBody, CredentialUpdateBody } from '../model/actions/types'

const types = new Set<CredentialFieldType>(['text', 'secret', 'url', 'note'])
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

export function parseCredentialList(value: unknown): readonly MaskedCredentialListItem[] {
  if (!Array.isArray(value)) {
    throw new Error('Invalid credential list')
  }
  return value.map((item) => {
    if (!record(item) || typeof item.id !== 'string' || typeof item.title !== 'string' || !record(item.category)
      || typeof item.category.id !== 'string' || typeof item.category.name !== 'string'
      || !(item.login === null || typeof item.login === 'string')
      || typeof item.hasLogin !== 'boolean' || typeof item.hasPassword !== 'boolean'
      || typeof item.updatedAt !== 'string' || typeof item.canUpdate !== 'boolean' || typeof item.canArchive !== 'boolean'
      || !record(item.updatedBy) || typeof item.updatedBy.name !== 'string'
      || !(item.updatedBy.avatar === null || typeof item.updatedBy.avatar === 'string')
      || !Array.isArray(item.dynamicFields))
    {
      throw new Error('Invalid credential list')
    }
    const dynamicFields = item.dynamicFields.map((field) => {
      if (!record(field) || typeof field.id !== 'string' || typeof field.label !== 'string'
        || typeof field.type !== 'string' || !types.has(field.type as CredentialFieldType)) {
        throw new Error('Invalid credential list')
      }
      return { id: field.id, label: field.label, type: field.type as CredentialFieldType }
    })
    return {
      id: item.id,
      title: item.title,
      category: { id: item.category.id, name: item.category.name },
      login: item.login,
      hasLogin: item.hasLogin,
      hasPassword: item.hasPassword,
      dynamicFields,
      updatedAt: item.updatedAt,
      updatedBy: { name: item.updatedBy.name, avatar: item.updatedBy.avatar },
      canUpdate: item.canUpdate,
      canArchive: item.canArchive,
    }
  })
}

export const credentialsApi = {
  load: async (projectId: string, signal: AbortSignal) =>
    parseCredentialList(await $fetch(`/api/projects/${projectId}/credentials`, { signal })),
  create: (projectId: string, body: CredentialCreateBody, signal: AbortSignal) =>
    $fetch(`/api/projects/${projectId}/credentials`, { method: 'POST', body, signal }),
  update: (projectId: string, credentialId: string, body: CredentialUpdateBody, signal: AbortSignal) =>
    $fetch(`/api/projects/${projectId}/credentials/${credentialId}`, { method: 'PATCH', body, signal }),
  reveal: (projectId: string, credentialId: string, target: 'password', signal: AbortSignal) =>
    $fetch<{ value: string }>(`/api/projects/${projectId}/credentials/${credentialId}/reveal`, { method: 'POST', body: { target }, signal }),
  archive: (projectId: string, credentialId: string, signal: AbortSignal) =>
    $fetch(`/api/projects/${projectId}/credentials/${credentialId}`, { method: 'DELETE', signal }),
}
