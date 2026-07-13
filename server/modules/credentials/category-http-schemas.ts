import { z } from 'zod'
import type { CredentialCategoryBody, CredentialCategoryGrantsBody } from '../../../shared/credentials/category-contracts'

export const categoryBodySchema: z.ZodType<CredentialCategoryBody> = z.object({
  name: z.string(),
  description: z.string().nullable(),
}).strict()

export const categoryGrantsBodySchema: z.ZodType<CredentialCategoryGrantsBody> = z.object({
  roleIds: z.array(z.string().uuid()).max(100),
  membershipIds: z.array(z.string().uuid()).max(1000),
}).strict()
