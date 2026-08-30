import type {
  AdministrationAuditQuery,
  AdministrationAuditResponse,
  AdministrationAuditTargetResponse,
} from '../../../../shared/administration/contracts'
import { administrationAuditResponseSchema, administrationAuditTargetResponseSchema } from '../../../../shared/administration/contracts'
import type { AdministrationProjectListItem } from '../../../../shared/projects/contracts'
import { administrationProjectsResponseSchema } from '../../../../shared/projects/contracts'
import { decodeApiResponse } from '../../../shared/api/decode-api-response'

export const administrationAuditApi = {
  async list(query: AdministrationAuditQuery, signal?: AbortSignal): Promise<AdministrationAuditResponse> {
    const response: unknown = await $fetch('/api/administration/audit', { query, signal })
    return decodeApiResponse(
      administrationAuditResponseSchema,
      response,
      'GET /api/administration/audit',
    )
  },
  async listProjects(signal?: AbortSignal): Promise<readonly AdministrationProjectListItem[]> {
    const projects: AdministrationProjectListItem[] = []
    let cursor: string | undefined

    do {
      const response: unknown = await $fetch('/api/administration/projects', {
        query: { limit: 100, ...(cursor === undefined ? {} : { cursor }) },
        signal,
      })
      const page = decodeApiResponse(
        administrationProjectsResponseSchema,
        response,
        'GET /api/administration/projects',
      )
      projects.push(...page.items)
      cursor = page.nextCursor ?? undefined
    } while (cursor !== undefined)

    return projects.toSorted((left, right) => left.name.localeCompare(right.name, 'ru'))
  },
  async getTarget(auditEventId: string, signal?: AbortSignal): Promise<AdministrationAuditTargetResponse> {
    const response: unknown = await $fetch(`/api/administration/audit/${auditEventId}/target`, { signal })
    return decodeApiResponse(
      administrationAuditTargetResponseSchema,
      response,
      'GET /api/administration/audit/:id/target',
    )
  },
}
