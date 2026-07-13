import { z } from 'zod'
import { CREDENTIAL_FIELD_TYPE } from '../../../shared/credentials/constants'

const fieldType = z.enum([
  CREDENTIAL_FIELD_TYPE.TEXT,
  CREDENTIAL_FIELD_TYPE.SECRET,
  CREDENTIAL_FIELD_TYPE.URL,
  CREDENTIAL_FIELD_TYPE.NOTE,
])
const valueOperation = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('keep') }).strict(),
  z.object({ kind: z.literal('clear') }).strict(),
  z.object({ kind: z.literal('replace'), value: z.string() }).strict(),
])

export const createCredentialBodySchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string(),
  login: z.string().nullable().optional(),
  password: z.string().nullable().optional(),
  fields: z.array(z.object({
    id: z.string().uuid().optional(),
    label: z.string(),
    type: fieldType,
    value: z.string(),
  }).strict()).max(50),
}).strict()

export const updateCredentialBodySchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string(),
  login: valueOperation,
  password: valueOperation,
  fields: z.array(z.object({
    id: z.string().uuid().optional(),
    label: z.string(),
    type: fieldType,
    value: valueOperation,
  }).strict()).max(50),
}).strict()

export const revealCredentialBodySchema = z.object({
  target: z.string().regex(/^(login|password|field:[0-9a-f-]{36})$/i),
}).strict()
