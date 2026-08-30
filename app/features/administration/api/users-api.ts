import type {
  AdministrationUserDetail,
  AdministrationUsersResponse,
} from '../../../../shared/administration/contracts'
import {
  administrationUserDetailSchema,
  administrationUsersResponseSchema,
} from '../../../../shared/administration/contracts'
import { decodeApiResponse } from '../../../shared/api/decode-api-response'

export const administrationUsersApi = {
  async list(): Promise<AdministrationUsersResponse> {
    const response: unknown = await $fetch('/api/administration/users')
    return decodeApiResponse(administrationUsersResponseSchema, response, 'GET /api/administration/users')
  },
  async get(userId: string): Promise<AdministrationUserDetail> {
    const response: unknown = await $fetch(`/api/administration/users/${userId}`)
    return decodeApiResponse(administrationUserDetailSchema, response, 'GET /api/administration/users/:id')
  },
}
