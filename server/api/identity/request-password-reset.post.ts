import { createError, defineEventHandler, getRequestIP, readBody } from 'h3'
import { z } from 'zod'
import { getServerEnv } from '../../../shared/config/env'
import { IdentityError } from '../../modules/identity/errors'
import { requestPasswordReset } from '../../modules/identity/password-recovery'

const bodySchema = z.object({ email: z.string().email().max(255) })

export default defineEventHandler(async (event) => {
  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request' })
  }

  const env = getServerEnv()

  try {
    const code = await requestPasswordReset({
      email: parsed.data.email,
      ip: getRequestIP(event, { xForwardedFor: env.TRUST_PROXY }) ?? 'unknown',
    })
    return { code }
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
