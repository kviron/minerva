import {
  appendResponseHeader,
  createError,
  defineEventHandler,
  getRequestIP,
  readBody,
} from 'h3'
import { z } from 'zod'
import { getServerEnv } from '../../../shared/config/env'
import { IdentityError } from '../../modules/identity/errors'
import { signInWithIdentifier } from '../../modules/identity/sign-in'

const bodySchema = z.object({
  identifier: z.string().min(1).max(255),
  password: z.string().min(1).max(256),
})

export default defineEventHandler(async (event) => {
  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request' })
  }

  const env = getServerEnv()

  try {
    const result = await signInWithIdentifier({
      ...parsed.data,
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
