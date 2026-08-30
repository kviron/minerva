import {
  appendResponseHeader,
  createError,
  defineEventHandler,
  getRequestIP,
  readValidatedBody,
  setHeader,
} from 'h3'
import { getServerEnv } from '../../config/runtime-env'
import { signInRequestSchema } from '../../../shared/identity/contracts'
import { IdentityError } from '../../modules/identity/identity-error'
import { signInWithIdentifier } from '../../modules/identity/sign-in/sign-in'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  let body
  try {
    body = await readValidatedBody(event, value => signInRequestSchema.parse(value))
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request' })
  }

  const env = getServerEnv()

  try {
    const result = await signInWithIdentifier({
      ...body,
      ip: getRequestIP(event, { xForwardedFor: env.TRUST_PROXY }) ?? 'unknown',
      requestHeaders: event.headers,
    })

    for (const cookie of result.headers.getSetCookie()) {
      appendResponseHeader(event, 'set-cookie', cookie)
    }

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
