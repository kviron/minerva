import { z } from 'zod'
import type {
  AdministrationUserDetail,
  AdministrationUsersResponse,
} from '../../../../shared/administration/users'

const administrationUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  username: z.string().min(1).nullable(),
  status: z.enum(['active', 'disabled']),
  superAdmin: z.boolean(),
  createdAt: z.string().datetime(),
  lastLoginAt: z.string().datetime().nullable(),
}).strict()

export function parseAdministrationUsersResponse(value: unknown): AdministrationUsersResponse {
  const parsed = z.array(administrationUserSchema).safeParse(value)
  if (!parsed.success) throw new Error('Invalid administration users response')
  return parsed.data
}

export function parseAdministrationUserResponse(value: unknown): AdministrationUserDetail {
  const parsed = administrationUserSchema.safeParse(value)
  if (!parsed.success) throw new Error('Invalid administration user response')
  return parsed.data
}

export const administrationUsersApi = {
  async list(): Promise<AdministrationUsersResponse> {
    return parseAdministrationUsersResponse(await $fetch('/api/administration/users'))
  },
  async get(userId: string): Promise<AdministrationUserDetail> {
    return parseAdministrationUserResponse(await $fetch(`/api/administration/users/${userId}`))
  },
}
