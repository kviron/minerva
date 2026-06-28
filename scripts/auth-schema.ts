import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { createMinervaAuth } from '../server/modules/identity/create-auth'

const queryClient = postgres(
  process.env.DATABASE_URL ?? 'postgresql://minerva:minerva@127.0.0.1:5433/minerva_test',
  { max: 1 },
)

export const auth = createMinervaAuth({
  mode: 'runtime',
  db: drizzle(queryClient),
  baseURL: 'http://127.0.0.1:3000',
  trustedOrigins: ['http://127.0.0.1:3000'],
  mailer: { sendPasswordReset: async () => {} },
})
