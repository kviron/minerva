import { createError, defineEventHandler, getRequestIP, readBody } from 'h3'
import { z } from 'zod'
import { getServerEnv } from '../../../shared/config/env'
import { IdentityError } from '../../modules/identity/errors'
import { resetPassword } from '../../modules/identity/password-recovery'

const bodySchema = z.object({
  token: z.string().min(1).max(512),
  newPassword: z.string().min(12).max(256),
})

export default defineEventHandler(async (event) => {
  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request' })
  }

  const env = getServerEnv()

  try {
    await resetPassword({
      ...parsed.data,
      ip: getRequestIP(event, { xForwardedFor: env.TRUST_PROXY }) ?? 'unknown',
    })
    return { ok: true }
  } catch (error) {
    if (error instanceof IdentityError) {
      throw createError({
        statusCode: error.statusCode,
        statusMessage: error.code,
        data: { code: error.code },
      })
    }
    throw error
  }
})
