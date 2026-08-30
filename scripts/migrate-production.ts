import { readFileSync } from 'node:fs'

import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

import { resolveSecretFileValues } from '../server/config/secret-files'

const resolved = resolveSecretFileValues(process.env, ['DATABASE_URL'], path => readFileSync(path, 'utf8'))
const databaseUrl = resolved.DATABASE_URL

if (!databaseUrl) {
  throw new Error('Production database configuration is unavailable')
}

const client = postgres(databaseUrl, {
  max: 1,
  connect_timeout: 10,
  idle_timeout: 5,
})

try {
  await migrate(drizzle(client), { migrationsFolder: 'drizzle' })
}
finally {
  await client.end({ timeout: 5 })
}
