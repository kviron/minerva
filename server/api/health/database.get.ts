import { getServerEnv } from '../../../shared/config/env'
import { checkDatabase } from '../../infrastructure/database/health'

export default defineEventHandler(async () => {
  try {
    return await checkDatabase(getServerEnv().DATABASE_URL)
  } catch {
    throw createError({
      statusCode: 503,
      statusMessage: 'Service Unavailable',
      data: { code: 'SERVICE_UNAVAILABLE' },
    })
  }
})
