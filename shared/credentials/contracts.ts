import { z } from 'zod'
import { CREDENTIAL_FIELD_TYPE } from './constants'

const credentialIdentitySchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  category: z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
  }).strict().readonly(),
  hasLogin: z.boolean(),
  hasPassword: z.boolean(),
}).strict()

const credentialFieldTypeSchema = z.nativeEnum(CREDENTIAL_FIELD_TYPE)
const dynamicCredentialFieldSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1),
  type: credentialFieldTypeSchema,
}).strict().readonly()

export const maskedCredentialListItemSchema = credentialIdentitySchema.extend({
  login: z.string().nullable(),
  dynamicFields: z.array(dynamicCredentialFieldSchema).readonly(),
  updatedAt: z.string().datetime(),
  updatedBy: z.object({
    name: z.string().min(1),
    avatar: z.string().nullable(),
  }).strict().readonly(),
  canUpdate: z.boolean(),
  canArchive: z.boolean(),
}).strict().readonly()

export const archivedCredentialListItemSchema = credentialIdentitySchema.extend({
  dynamicFieldCount: z.number().int().nonnegative(),
  archivedAt: z.string().datetime(),
  archivedBy: z.object({ name: z.string().min(1) }).strict().readonly(),
}).strict().readonly()

export const credentialListResponseSchema = z.array(maskedCredentialListItemSchema).readonly()
export const archivedCredentialListResponseSchema = z.array(archivedCredentialListItemSchema).readonly()

export const secretOperationSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('keep') }).strict(),
  z.object({ kind: z.literal('clear') }).strict(),
  z.object({ kind: z.literal('replace'), value: z.string() }).strict(),
]).readonly()

const createCredentialFieldSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string(),
  type: credentialFieldTypeSchema,
  value: z.string(),
}).strict().readonly()

const updateCredentialFieldSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string(),
  type: credentialFieldTypeSchema,
  value: secretOperationSchema,
}).strict().readonly()

export const createCredentialBodySchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string(),
  login: z.string().nullable().optional(),
  password: z.string().nullable().optional(),
  fields: z.array(createCredentialFieldSchema).max(50).readonly(),
}).strict().readonly()

export const updateCredentialBodySchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string(),
  login: secretOperationSchema,
  password: secretOperationSchema,
  fields: z.array(updateCredentialFieldSchema).max(50).readonly(),
}).strict().readonly()

const dynamicCredentialSecretTargetSchema = z.custom<`field:${string}`>(
  value => typeof value === 'string' && /^field:[0-9a-f-]{36}$/i.test(value),
)

export const revealCredentialBodySchema = z.object({
  target: z.union([z.literal('login'), z.literal('password'), dynamicCredentialSecretTargetSchema]),
}).strict().readonly()

export const searchCredentialBodySchema = z.object({
  query: z.string().max(500),
}).strict().readonly()

export const credentialIdResponseSchema = z.object({ credentialId: z.string().uuid() }).strict().readonly()
export const credentialMutationResponseSchema = z.object({ ok: z.literal(true) }).strict().readonly()
export const credentialRevealResponseSchema = z.object({ value: z.string() }).strict().readonly()

export type MaskedCredentialListItem = z.infer<typeof maskedCredentialListItemSchema>
export type ArchivedCredentialListItem = z.infer<typeof archivedCredentialListItemSchema>
export type CredentialListResponse = z.infer<typeof credentialListResponseSchema>
export type ArchivedCredentialListResponse = z.infer<typeof archivedCredentialListResponseSchema>
export type SecretOperation = z.infer<typeof secretOperationSchema>
export type CredentialCreateBody = z.infer<typeof createCredentialBodySchema>
export type CredentialUpdateBody = z.infer<typeof updateCredentialBodySchema>
export type CredentialSecretTarget = z.infer<typeof revealCredentialBodySchema>['target']
export type CredentialIdResponse = z.infer<typeof credentialIdResponseSchema>
export type CredentialMutationResponse = z.infer<typeof credentialMutationResponseSchema>
export type CredentialRevealResponse = z.infer<typeof credentialRevealResponseSchema>
