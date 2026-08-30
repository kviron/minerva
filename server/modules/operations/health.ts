export const HEALTH_STATUS = {
  OK: 'ok',
  UNAVAILABLE: 'unavailable',
} as const

export type HealthyStatus = Readonly<{ status: typeof HEALTH_STATUS.OK }>
export type UnavailableStatus = Readonly<{ status: typeof HEALTH_STATUS.UNAVAILABLE }>

type ReadinessDependencies = Readonly<{
  initializeConfiguration: () => void
  checkDatabase: () => Promise<void>
  checkMigrations: () => Promise<void>
  checkObjectStorage: () => Promise<void>
}>

export const healthyStatus = (): HealthyStatus => ({ status: HEALTH_STATUS.OK })
export const unavailableStatus = (): UnavailableStatus => ({ status: HEALTH_STATUS.UNAVAILABLE })

export const createReadinessCheck = (dependencies: ReadinessDependencies) => async (): Promise<HealthyStatus> => {
  dependencies.initializeConfiguration()
  await dependencies.checkDatabase()
  await dependencies.checkMigrations()
  await dependencies.checkObjectStorage()
  return healthyStatus()
}

