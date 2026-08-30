import type { ProjectIconResponse } from '../../../../shared/projects/contracts'
import { projectIconResponseSchema } from '../../../../shared/projects/contracts'
import { decodeApiResponse } from '../../../shared/api/decode-api-response'

export const projectIconsApi = {
  async upload(projectId: string, file: File, signal: AbortSignal): Promise<ProjectIconResponse> {
    const body = new FormData()
    body.append('file', file)
    const response: unknown = await $fetch(`/api/projects/${projectId}/icon`, { method: 'PUT', body, signal })
    return decodeApiResponse(projectIconResponseSchema, response, 'PUT /api/projects/:projectId/icon')
  },
  async remove(projectId: string, signal: AbortSignal): Promise<ProjectIconResponse> {
    const response: unknown = await $fetch(`/api/projects/${projectId}/icon`, { method: 'DELETE', signal })
    return decodeApiResponse(projectIconResponseSchema, response, 'DELETE /api/projects/:projectId/icon')
  },
}
