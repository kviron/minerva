import { and, asc, eq, isNull } from 'drizzle-orm'
import type { DocumentPublicationState } from '../../../shared/documents/constants'
import type {
  DocumentContent,
  DocumentDetailResponse,
  DocumentRelationItem,
  DocumentTreeNode,
  DocumentTreeResponse,
} from '../../../shared/documents/contracts'
import { MEMBERSHIP_STATUS, PROJECT_PERMISSION } from '../../../shared/projects/constants'
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

interface SelectedDocumentRow {
  readonly id: string
  readonly title: string
  readonly slug: string
  readonly parentId: string | null
  readonly draftRevision: number
  readonly draftContent: DocumentContent
  readonly publicationState: DocumentPublicationState
  readonly updatedAt: Date
}

const compareRows = (left: DocumentTreeRow, right: DocumentTreeRow): number =>
  left.position - right.position || left.title.localeCompare(right.title, 'ru')

export const buildDocumentTree = (rows: readonly DocumentTreeRow[]): DocumentTreeResponse => {
  const activeRows = rows.filter(row => row.archivedAt === null)
  const childrenByParent = new Map<string | null, DocumentTreeRow[]>()
  for (const row of activeRows) {
    const siblings = childrenByParent.get(row.parentId) ?? []
    childrenByParent.set(row.parentId, [...siblings, row])
  }

  const buildNode = (row: DocumentTreeRow, path: ReadonlySet<string>): DocumentTreeNode | null => {
    if (path.has(row.id)) {
      return null
    }
    const nextPath = new Set(path)
    nextPath.add(row.id)
    const children = (childrenByParent.get(row.id) ?? [])
      .toSorted(compareRows)
      .flatMap((child) => {
        const node = buildNode(child, nextPath)
        return node === null ? [] : [node]
      })

    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      updatedAt: row.updatedAt.toISOString(),
      publicationState: row.publicationState,
      children,
    }
  }

  return (childrenByParent.get(null) ?? [])
    .toSorted(compareRows)
    .flatMap((root) => {
      const node = buildNode(root, new Set())
      return node === null ? [] : [node]
    })
}

export const buildDocumentDetail = (
  selected: SelectedDocumentRow,
  rows: readonly DocumentTreeRow[],
): DocumentDetailResponse | null => {
  const activeRows = rows.filter(row => row.archivedAt === null)
  const rowById = new Map(activeRows.map(row => [row.id, row]))
  const ancestors: DocumentRelationItem[] = []
  const visited = new Set<string>([selected.id])
  let parentId = selected.parentId

  while (parentId !== null) {
    if (visited.has(parentId)) {
      return null
    }
    const parent = rowById.get(parentId)
    if (!parent) {
      return null
    }
    visited.add(parent.id)
    ancestors.push({ id: parent.id, title: parent.title })
    parentId = parent.parentId
  }

  const children = activeRows
    .filter(row => row.parentId === selected.id)
    .toSorted(compareRows)
    .map(({ id, title }): DocumentRelationItem => ({ id, title }))

  return {
    id: selected.id,
    title: selected.title,
    slug: selected.slug,
    parentId: selected.parentId,
    draftRevision: selected.draftRevision,
    draftContent: selected.draftContent,
    publicationState: selected.publicationState,
    updatedAt: selected.updatedAt.toISOString(),
    ancestors: ancestors.reverse(),
    children,
  }
}

const canViewDocuments = async (
  db: DocumentsDatabase,
  projectId: string,
  actorUserId: string,
): Promise<boolean> => {
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
  return access !== undefined
}

const loadActiveTreeRows = (db: DocumentsDatabase, projectId: string) => db.select({
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

export const listDocumentTreeForUser = async (
  db: DocumentsDatabase,
  projectId: string,
  actorUserId: string,
): Promise<DocumentTreeResponse | null> => {
  if (!await canViewDocuments(db, projectId, actorUserId)) {
    return null
  }
  return buildDocumentTree(await loadActiveTreeRows(db, projectId))
}

export const getDocumentForUser = async (
  db: DocumentsDatabase,
  projectId: string,
  documentId: string,
  actorUserId: string,
): Promise<DocumentDetailResponse | null> => {
  if (!await canViewDocuments(db, projectId, actorUserId)) {
    return null
  }

  const [selected] = await db.select({
    id: documents.id,
    title: documents.title,
    slug: documents.slug,
    parentId: documents.parentId,
    draftRevision: documents.draftRevision,
    draftContent: documents.draftContent,
    publicationState: documents.publicationState,
    updatedAt: documents.updatedAt,
  })
    .from(documents)
    .where(and(
      eq(documents.id, documentId),
      eq(documents.projectId, projectId),
      isNull(documents.archivedAt),
    ))
    .limit(1)

  if (!selected) {
    return null
  }
  return buildDocumentDetail(selected, await loadActiveTreeRows(db, projectId))
}

export const listCurrentUserDocumentTree = (projectId: string, actorUserId: string) =>
  listDocumentTreeForUser(getDatabase().db, projectId, actorUserId)

export const getCurrentUserDocument = (projectId: string, documentId: string, actorUserId: string) =>
  getDocumentForUser(getDatabase().db, projectId, documentId, actorUserId)
