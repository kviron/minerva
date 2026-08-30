import { REQUIRED_MIGRATION_CREATED_AT } from '../../config/migration-manifest'
import {
  getObjectStorageEnv,
  getServerEnv,
  initializeRuntimeConfiguration,
} from '../../config/runtime-env'
import { checkDatabase, checkDatabaseMigrations } from '../../infrastructure/database/health'
import { checkObjectStorage } from '../../infrastructure/storage/health'
import { createReadinessCheck, unavailableStatus } from '../../modules/operations/health'

const checkReadiness = createReadinessCheck({
  initializeConfiguration: initializeRuntimeConfiguration,
  checkDatabase: async () => {
    await checkDatabase(getServerEnv().DATABASE_URL)
  },
  checkMigrations: async () => {
    await checkDatabaseMigrations(getServerEnv().DATABASE_URL, REQUIRED_MIGRATION_CREATED_AT)
  },
  checkObjectStorage: async () => {
    await checkObjectStorage(getObjectStorageEnv())
  },
})

export default defineEventHandler(async (event) => {
  try {
    return await checkReadiness()
  }
  catch {
    setResponseStatus(event, 503, 'Service Unavailable')
    return unavailableStatus()
  }
})

