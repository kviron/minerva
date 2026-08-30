import { asc, desc, eq } from 'drizzle-orm'
import type {
  AdministrationUserDetail,
  AdministrationUsersResponse,
} from '../../../shared/administration/contracts'
import { getDatabase } from '../../infrastructure/database/client'
import { user } from '../../infrastructure/database/schema/auth'

type AdministrationDatabase = ReturnType<typeof getDatabase>['db']

const administrationUserSelection = {
  id: user.id,
  name: user.name,
  email: user.email,
  username: user.displayUsername,
  status: user.status,
  superAdmin: user.superAdmin,
  createdAt: user.createdAt,
  lastLoginAt: user.lastLoginAt,
} as const

type AdministrationUserRow = {
  readonly id: string
  readonly name: string
  readonly email: string
  readonly username: string | null
  readonly status: AdministrationUserDetail['status']
  readonly superAdmin: boolean
  readonly createdAt: Date
  readonly lastLoginAt: Date | null
}

const toAdministrationUser = (row: AdministrationUserRow): AdministrationUserDetail => ({
  id: row.id,
  name: row.name,
  email: row.email,
  username: row.username,
  status: row.status,
  superAdmin: row.superAdmin,
  createdAt: row.createdAt.toISOString(),
  lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
})

export async function listAdministrationUsers(
  db: AdministrationDatabase,
): Promise<AdministrationUsersResponse> {
  const rows = await db.select(administrationUserSelection)
    .from(user)
    .orderBy(desc(user.createdAt), asc(user.id))

  return rows.map(toAdministrationUser)
}

export const listAllUsers = () => listAdministrationUsers(getDatabase().db)

export async function getAdministrationUser(
  db: AdministrationDatabase,
  userId: string,
): Promise<AdministrationUserDetail | null> {
  const [result] = await db.select(administrationUserSelection)
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)

  return result ? toAdministrationUser(result) : null
}

export const getAdministrationUserById = (userId: string) =>
  getAdministrationUser(getDatabase().db, userId)
