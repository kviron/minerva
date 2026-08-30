import { z } from 'zod'
import { PROJECT_ROLE_KEY } from '../projects/constants'

const credentialCategoryDetailsBaseSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
}).strict()

export const credentialCategoryDetailsSchema = credentialCategoryDetailsBaseSchema.readonly()

export const credentialCategoryListItemSchema = credentialCategoryDetailsBaseSchema.extend({
  position: z.number().int().nonnegative(),
}).strict().readonly()

export const credentialCategorySchema = credentialCategoryDetailsBaseSchema.extend({
  roleIds: z.array(z.string().uuid()).readonly(),
  membershipIds: z.array(z.string().uuid()).readonly(),
}).strict().readonly()

export const credentialCategoryRoleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  builtInKey: z.nativeEnum(PROJECT_ROLE_KEY).nullable(),
}).strict().readonly()

export const credentialCategoryMemberSchema = z.object({
  membershipId: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
}).strict().readonly()

export const credentialCategoryManagementSchema = z.object({
  canManage: z.boolean(),
  canCreateCategories: z.boolean(),
  canCreateCredentials: z.boolean(),
  categories: z.array(credentialCategorySchema).readonly(),
  roles: z.array(credentialCategoryRoleSchema).readonly(),
  members: z.array(credentialCategoryMemberSchema).readonly(),
}).strict().readonly()

export const credentialCategoryBodySchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
}).strict().readonly()

export const credentialCategoryGrantsBodySchema = z.object({
  roleIds: z.array(z.string().uuid()).max(100).readonly(),
  membershipIds: z.array(z.string().uuid()).max(1000).readonly(),
}).strict().readonly()

export const credentialCategoryIdResponseSchema = z.object({
  categoryId: z.string().uuid(),
}).strict().readonly()

export const credentialCategoryMutationResponseSchema = z.object({
  ok: z.literal(true),
}).strict().readonly()

export type CredentialCategoryDetails = z.infer<typeof credentialCategoryDetailsSchema>
export type CredentialCategoryListItem = z.infer<typeof credentialCategoryListItemSchema>
export type CredentialCategory = z.infer<typeof credentialCategorySchema>
export type CredentialCategoryRole = z.infer<typeof credentialCategoryRoleSchema>
export type CredentialCategoryMember = z.infer<typeof credentialCategoryMemberSchema>
export type CredentialCategoryManagement = z.infer<typeof credentialCategoryManagementSchema>
export type CredentialCategoryBody = z.infer<typeof credentialCategoryBodySchema>
export type CredentialCategoryGrantsBody = z.infer<typeof credentialCategoryGrantsBodySchema>
export type CredentialCategoryIdResponse = z.infer<typeof credentialCategoryIdResponseSchema>
export type CredentialCategoryMutationResponse = z.infer<typeof credentialCategoryMutationResponseSchema>
