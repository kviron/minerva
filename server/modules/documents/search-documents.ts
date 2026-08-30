import { and, desc, eq, inArray, isNull, max, sql } from 'drizzle-orm'
import { DOCUMENT_PUBLICATION_STATE } from '../../../shared/documents/constants'
import type {
  DocumentContent,
  DocumentContentNode,
  DocumentSearchResponse,
  DocumentSearchResultItem,
} from '../../../shared/documents/contracts'
import { parseFigmaEmbedDescriptor } from '../../../shared/embeds/figma'
import { MEMBERSHIP_STATUS, PROJECT_PERMISSION } from '../../../shared/projects/constants'
import { getDatabase } from '../../infrastructure/database/client'
import { documents, documentVersions } from '../../infrastructure/database/schema/documents'
import { projectMemberships, projectRolePermissions } from '../../infrastructure/database/schema/projects'

type DocumentsDatabase = ReturnType<typeof getDatabase>['db']

const appendSearchableText = (node: DocumentContentNode, values: string[]): void => {
  if (node.type === 'text' && typeof node.text === 'string') {
    values.push(node.text)
  }
  if (node.type === 'image') {
    const alt = node.attrs?.alt
    if (typeof alt === 'string') values.push(alt)
  }
  if (node.type === 'externalEmbed') {
    const descriptor = parseFigmaEmbedDescriptor(node.attrs)
    if (descriptor) values.push(descriptor.title)
  }
  for (const child of node.content ?? []) appendSearchableText(child, values)
}

export const extractDocumentSearchText = (content: DocumentContent): string => {
  const values: string[] = []
  for (const node of content.content) appendSearchableText(node, values)
  return values.join(' ').replace(/\s+/gu, ' ').trim()
}

export const normalizeDocumentSearchQuery = (value: string): string =>
  value.trim().replace(/\s+/gu, ' ').toLocaleLowerCase('ru-RU')

export const buildDocumentSearchExcerpt = (text: string, query: string, maximumLength = 180): string => {
  const normalizedText = text.replace(/\s+/gu, ' ').trim()
  if (normalizedText.length <= maximumLength) return normalizedText
  const terms = normalizeDocumentSearchQuery(query).split(' ').filter(Boolean)
  const lowerText = normalizedText.toLocaleLowerCase('ru-RU')
  const firstMatch = terms.reduce<number>((closest, term) => {
    const index = lowerText.indexOf(term)
    return index < 0 || (closest >= 0 && closest <= index) ? closest : index
  }, -1)
  const center = firstMatch < 0 ? 0 : firstMatch
  const rawStart = Math.max(0, center - Math.floor(maximumLength / 3))
  const hasPrefix = rawStart > 0
  const contentLength = maximumLength - (hasPrefix ? 1 : 0) - 1
  const start = Math.min(rawStart, Math.max(0, normalizedText.length - contentLength))
  const end = Math.min(normalizedText.length, start + contentLength)
  const hasSuffix = end < normalizedText.length
  const available = maximumLength - (hasPrefix ? 1 : 0) - (hasSuffix ? 1 : 0)
  const body = normalizedText.slice(start, start + available).trim()
  return `${hasPrefix ? '…' : ''}${body}${hasSuffix ? '…' : ''}`
}

const searchVector = (title: unknown, text: unknown) =>
  sql`minerva_document_search_vector(${title}, ${text})`

const searchQuery = (query: string) => sql`(
  websearch_to_tsquery('russian', ${query}) || websearch_to_tsquery('english', ${query})
)`

interface SearchRow {
  readonly id: string
  readonly title: string
  readonly searchText: string
  readonly updatedAt: Date
  readonly publicationState: DocumentSearchResultItem['publicationState']
}

const toSearchResponse = (rows: readonly SearchRow[], query: string): DocumentSearchResponse => rows.map(row => ({
  id: row.id,
  title: row.title,
  excerpt: buildDocumentSearchExcerpt(row.searchText, query),
  updatedAt: row.updatedAt.toISOString(),
  publicationState: row.publicationState,
}))

const searchDrafts = async (
  db: DocumentsDatabase,
  projectId: string,
  query: string,
): Promise<DocumentSearchResponse> => {
  const vector = searchVector(documents.title, documents.draftSearchText)
  const tsQuery = searchQuery(query)
  const rows = await db.select({
    id: documents.id,
    title: documents.title,
    searchText: documents.draftSearchText,
    updatedAt: documents.updatedAt,
    publicationState: documents.publicationState,
  }).from(documents).where(and(
    eq(documents.projectId, projectId),
    isNull(documents.archivedAt),
    sql`${vector} @@ ${tsQuery}`,
  )).orderBy(desc(sql`ts_rank(${vector}, ${tsQuery})`), desc(documents.updatedAt)).limit(50)
  return toSearchResponse(rows, query)
}

const searchPublishedVersions = async (
  db: DocumentsDatabase,
  projectId: string,
  query: string,
): Promise<DocumentSearchResponse> => {
  const latestVersionNumbers = db.select({
    documentId: documentVersions.documentId,
    versionNumber: max(documentVersions.versionNumber).as('latest_version_number'),
  }).from(documentVersions).where(eq(documentVersions.projectId, projectId))
    .groupBy(documentVersions.documentId)
    .as('latest_document_version_numbers')
  const vector = searchVector(documentVersions.title, documentVersions.searchText)
  const tsQuery = searchQuery(query)
  const rows = await db.select({
    id: documents.id,
    title: documentVersions.title,
    searchText: documentVersions.searchText,
    updatedAt: documentVersions.publishedAt,
  }).from(documents)
    .innerJoin(latestVersionNumbers, eq(documents.id, latestVersionNumbers.documentId))
    .innerJoin(documentVersions, and(
      eq(documentVersions.documentId, latestVersionNumbers.documentId),
      eq(documentVersions.versionNumber, latestVersionNumbers.versionNumber),
    )).where(and(
    eq(documents.projectId, projectId),
    isNull(documents.archivedAt),
    sql`${vector} @@ ${tsQuery}`,
  )).orderBy(desc(sql`ts_rank(${vector}, ${tsQuery})`), desc(documentVersions.publishedAt)).limit(50)

  return toSearchResponse(rows.map(row => ({
    ...row,
    publicationState: DOCUMENT_PUBLICATION_STATE.PUBLISHED,
  })), query)
}

export const searchDocumentsForUser = async (
  db: DocumentsDatabase,
  projectId: string,
  actorUserId: string,
  rawQuery: string,
): Promise<DocumentSearchResponse | null> => {
  const permissionRows = await db.select({ permissionCode: projectRolePermissions.permissionCode })
    .from(projectMemberships)
    .innerJoin(projectRolePermissions, eq(projectMemberships.roleId, projectRolePermissions.roleId))
    .where(and(
      eq(projectMemberships.projectId, projectId),
      eq(projectMemberships.userId, actorUserId),
      eq(projectMemberships.status, MEMBERSHIP_STATUS.ACTIVE),
      inArray(projectRolePermissions.permissionCode, [
        PROJECT_PERMISSION.DOCUMENTS_VIEW,
        PROJECT_PERMISSION.DOCUMENTS_UPDATE_DRAFT,
      ]),
    ))
  const permissions = new Set(permissionRows.map(row => row.permissionCode))
  if (!permissions.has(PROJECT_PERMISSION.DOCUMENTS_VIEW)) return null

  const query = normalizeDocumentSearchQuery(rawQuery)
  if (query.length === 0) return []
  return permissions.has(PROJECT_PERMISSION.DOCUMENTS_UPDATE_DRAFT)
    ? searchDrafts(db, projectId, query)
    : searchPublishedVersions(db, projectId, query)
}

export const searchCurrentUserDocuments = (projectId: string, actorUserId: string, query: string) =>
  searchDocumentsForUser(getDatabase().db, projectId, actorUserId, query)
