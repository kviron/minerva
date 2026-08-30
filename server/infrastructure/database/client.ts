import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { getServerEnv } from '../../config/runtime-env'

export function createDatabase(url: string, max = 10) {
  const queryClient = postgres(url, { max })

  return {
    db: drizzle(queryClient),
    queryClient,
    close: () => queryClient.end(),
  }
}

let runtimeDatabase: ReturnType<typeof createDatabase> | undefined

export function getDatabase() {
  return runtimeDatabase ??= createDatabase(getServerEnv().DATABASE_URL)
}

export async function closeDatabase() {
  await runtimeDatabase?.close()
  runtimeDatabase = undefined
}
