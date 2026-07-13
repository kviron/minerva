import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { AUTH_MODE } from '../../shared/identity/constants'
import { createMinervaAuth } from '../../server/modules/identity/auth/create-auth'
import { createTestDatabase, resetTestDatabase, TEST_DATABASE_URL } from '../helpers/database'
import { AUDIT_CHANNEL } from '../../shared/projects/constants'
import { createProjectPersistence } from '../../server/modules/projects/create-project'
import {
  AUTHORIZATION_API_TEST_USER,
  AUTHORIZATION_ROUTE_TEST_USER,
} from './fixtures/users'

export default async function globalSetup() {
  process.env.DATABASE_URL = TEST_DATABASE_URL
  process.env.BETTER_AUTH_SECRET = 'test-secret-012345678901234567890'
  process.env.BETTER_AUTH_URL = 'http://127.0.0.1:3000'

  await fetch('http://127.0.0.1:8025/api/v1/messages', { method: 'DELETE' })
  await resetTestDatabase()
  const database = createTestDatabase()

  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })
    const auth = createMinervaAuth({
      mode: AUTH_MODE.TEST_SEED,
      db: database.db,
      baseURL: 'http://127.0.0.1:3000',
      trustedOrigins: ['http://127.0.0.1:3000'],
      mailer: { sendPasswordReset: async () => {} },
    })
    await auth.api.signUpEmail({
      body: {
        email: 'user@example.com',
        username: 'test.user',
        displayUsername: 'Test.User',
        name: 'Test.User',
        password: 'Correct-Horse-Battery-1',
      },
    })
    await auth.api.signUpEmail({
      body: {
        email: 'recovery@example.com',
        username: 'recovery.user',
        displayUsername: 'Recovery.User',
        name: 'Recovery.User',
        password: 'Correct-Horse-Battery-1',
      },
    })
    await auth.api.signUpEmail({ body: AUTHORIZATION_API_TEST_USER })
    await auth.api.signUpEmail({ body: AUTHORIZATION_ROUTE_TEST_USER })
    const adminAuth = createMinervaAuth({
      mode: AUTH_MODE.BOOTSTRAP,
      db: database.db,
      baseURL: 'http://127.0.0.1:3000',
      trustedOrigins: ['http://127.0.0.1:3000'],
      mailer: { sendPasswordReset: async () => {} },
    })
    await adminAuth.api.signUpEmail({
      body: {
        email: 'admin@example.com',
        username: 'super.admin',
        displayUsername: 'Super.Admin',
        name: 'Super.Admin',
        password: 'Correct-Horse-Battery-1',
      },
    })
    const [admin, viewer] = await database.queryClient<{ id: string }[]>`
      select id from "user" where email in ('admin@example.com', ${AUTHORIZATION_API_TEST_USER.email})
      order by case when email = 'admin@example.com' then 0 else 1 end
    `
    const persistProject = createProjectPersistence(database.db)
    const primary = await persistProject({
      actorUserId: admin!.id, channel: AUDIT_CHANNEL.WEB, name: 'Credentials E2E', description: null,
    })
    await persistProject({
      actorUserId: admin!.id, channel: AUDIT_CHANNEL.WEB, name: 'Credentials E2E Foreign', description: null,
    })
    const [viewerRole] = await database.queryClient<{ id: string }[]>`
      select id from project_roles where project_id = ${primary.projectId} and built_in_key = 'viewer'
    `
    await database.queryClient`
      insert into project_role_permissions (role_id, permission_code)
      values (${viewerRole!.id}, 'credentials.view')
      on conflict do nothing
    `
    await database.queryClient`
      insert into project_memberships (project_id, user_id, role_id)
      values (${primary.projectId}, ${viewer!.id}, ${viewerRole!.id})
    `
  } finally {
    await database.close()
  }
}
