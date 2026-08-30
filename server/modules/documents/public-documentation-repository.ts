import { and, desc, eq, isNull } from 'drizzle-orm'
import { PROJECT_STATUS } from '../../../shared/projects/constants'
import type { getDatabase } from '../../infrastructure/database/client'
import { documentPublicShares } from '../../infrastructure/database/schema/document-sharing'
import { documents, documentVersions } from '../../infrastructure/database/schema/documents'
import { documentImages } from '../../infrastructure/database/schema/files'
import { projects } from '../../infrastructure/database/schema/projects'
import { parseDocumentContent } from './content-schema'
import type { PublicDocumentationRepository } from './public-documentation'
import type { PublicDocumentCandidate } from './public-document-projection'

type Database = ReturnType<typeof getDatabase>['db']

export const createPublicDocumentationRepository = (
  db: Database,
): PublicDocumentationRepository => ({
  async loadScope(tokenHash) {
    const [share] = await db.select({
      projectId: documentPublicShares.projectId,
      projectName: projects.name,
      rootDocumentId: documentPublicShares.rootDocumentId,
      scope: documentPublicShares.scope,
    }).from(documentPublicShares)
      .innerJoin(projects, eq(documentPublicShares.projectId, projects.id))
      .innerJoin(documents, and(
        eq(documentPublicShares.rootDocumentId, documents.id),
        eq(documentPublicShares.projectId, documents.projectId),
      ))
      .where(and(
        eq(documentPublicShares.tokenHash, tokenHash),
        isNull(documentPublicShares.revokedAt),
        eq(projects.status, PROJECT_STATUS.ACTIVE),
        isNull(projects.archivedAt),
        isNull(documents.archivedAt),
      ))
      .limit(1)
    if (!share) return null

    const [documentRows, versionRows] = await Promise.all([
      db.select({
        id: documents.id,
        parentId: documents.parentId,
        position: documents.position,
        slug: documents.slug,
      }).from(documents).where(and(
        eq(documents.projectId, share.projectId),
        isNull(documents.archivedAt),
      )),
      db.select({
        documentId: documentVersions.documentId,
        title: documentVersions.title,
        content: documentVersions.draftContent,
        publishedAt: documentVersions.publishedAt,
        referencedImageIds: documentVersions.referencedImageIds,
      }).from(documentVersions)
        .where(eq(documentVersions.projectId, share.projectId))
        .orderBy(desc(documentVersions.versionNumber)),
    ])
    const latestByDocument = new Map<string, typeof versionRows[number]>()
    for (const version of versionRows) {
      if (!latestByDocument.has(version.documentId)) latestByDocument.set(version.documentId, version)
    }
    const candidates: PublicDocumentCandidate[] = documentRows.map((document) => {
      const version = latestByDocument.get(document.id)
      const content = version ? parseDocumentContent(version.content) : null
      return {
        ...document,
        version: version && content ? {
          title: version.title,
          content,
          publishedAt: version.publishedAt.toISOString(),
          referencedImageIds: version.referencedImageIds,
        } : null,
      }
    })
    return { ...share, documents: candidates }
  },

  async loadImageMetadata(projectId, imageId) {
    const [image] = await db.select({
      objectKey: documentImages.objectKey,
      filename: documentImages.filename,
      mimeType: documentImages.mimeType,
    }).from(documentImages).where(and(
      eq(documentImages.projectId, projectId),
      eq(documentImages.id, imageId),
    )).limit(1)
    return image ?? null
  },
})
