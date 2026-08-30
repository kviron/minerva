import { getServerEnv } from '../../config/runtime-env'
import { IDENTITY_CODE } from '../../../shared/identity/constants'
import { checkDatabase } from '../../infrastructure/database/health'

export default defineEventHandler(async () => {
  try {
    return await checkDatabase(getServerEnv().DATABASE_URL)
  } catch {
    throw createError({
      statusCode: 503,
      statusMessage: 'Service Unavailable',
      data: { code: IDENTITY_CODE.SERVICE_UNAVAILABLE },
    })
  }
})
