import { and, asc, eq, isNull } from 'drizzle-orm'
import { MEMBERSHIP_STATUS, PROJECT_PERMISSION } from '../../../shared/projects/constants'
import type { DocumentPublicationState } from '../../../shared/documents/constants'
import type { RootDocumentsResponse } from '../../../shared/documents/contracts'
import { getDatabase } from '../../infrastructure/database/client'
import { documents } from '../../infrastructure/database/schema/documents'
import { projectMemberships, projectRolePermissions } from '../../infrastructure/database/schema/projects'

type DocumentsDatabase = ReturnType<typeof getDatabase>['db']

interface DocumentTreeRow {
  readonly id: string
  readonly title: string
  readonly slug: string
  readonly parentId: string | null
  readonly position: number
  readonly updatedAt: Date
  readonly publicationState: DocumentPublicationState
  readonly archivedAt: Date | null
}

export const buildRootDocumentList = (rows: readonly DocumentTreeRow[]): RootDocumentsResponse => {
  const activeRows = rows.filter(row => row.archivedAt === null)
  const childCounts = new Map<string, number>()

  for (const row of activeRows) {
    if (row.parentId !== null) {
      childCounts.set(row.parentId, (childCounts.get(row.parentId) ?? 0) + 1)
    }
  }

  return activeRows
    .filter(row => row.parentId === null)
    .toSorted((left, right) => left.position - right.position || left.title.localeCompare(right.title, 'ru'))
    .map(row => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      childCount: childCounts.get(row.id) ?? 0,
      updatedAt: row.updatedAt.toISOString(),
      publicationState: row.publicationState,
    }))
}

export async function listRootDocumentsForUser(
  db: DocumentsDatabase,
  projectId: string,
  actorUserId: string,
): Promise<RootDocumentsResponse | null> {
  const [access] = await db.select({ membershipId: projectMemberships.id })
    .from(projectMemberships)
    .innerJoin(projectRolePermissions, eq(projectMemberships.roleId, projectRolePermissions.roleId))
    .where(and(
      eq(projectMemberships.projectId, projectId),
      eq(projectMemberships.userId, actorUserId),
      eq(projectMemberships.status, MEMBERSHIP_STATUS.ACTIVE),
      eq(projectRolePermissions.permissionCode, PROJECT_PERMISSION.DOCUMENTS_VIEW),
    ))
    .limit(1)

  if (!access) {
    return null
  }

  const rows = await db.select({
    id: documents.id,
    title: documents.title,
    slug: documents.slug,
    parentId: documents.parentId,
    position: documents.position,
    updatedAt: documents.updatedAt,
    publicationState: documents.publicationState,
    archivedAt: documents.archivedAt,
  })
    .from(documents)
    .where(and(eq(documents.projectId, projectId), isNull(documents.archivedAt)))
    .orderBy(asc(documents.position), asc(documents.title))

  return buildRootDocumentList(rows)
}

export const listCurrentUserRootDocuments = (projectId: string, actorUserId: string) =>
  listRootDocumentsForUser(getDatabase().db, projectId, actorUserId)
