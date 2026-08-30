import { createError, defineEventHandler, getRequestIP, readValidatedBody, setHeader } from 'h3'
import { getServerEnv } from '../../config/runtime-env'
import { resetPasswordRequestSchema } from '../../../shared/identity/contracts'
import { IdentityError } from '../../modules/identity/identity-error'
import { resetPassword } from '../../modules/identity/recovery/password-recovery'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  let body
  try {
    body = await readValidatedBody(event, value => resetPasswordRequestSchema.parse(value))
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request' })
  }

  const env = getServerEnv()

  try {
    await resetPassword({
      ...body,
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
