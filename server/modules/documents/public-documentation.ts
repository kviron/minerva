import { z } from 'zod'
import type { PublicDocumentationResponse } from '../../../shared/documents/public-share-contracts'
import { documentPublicShareTokenSchema } from '../../../shared/documents/public-share-contracts'
import type { DOCUMENT_PUBLIC_SHARE_SCOPE } from '../../../shared/documents/public-share-constants'
import { hashDocumentPublicShareToken } from './document-public-shares'
import {
  derivePublicDocumentProjection,
  type PublicDocumentCandidate,
} from './public-document-projection'

type ShareScope = typeof DOCUMENT_PUBLIC_SHARE_SCOPE[keyof typeof DOCUMENT_PUBLIC_SHARE_SCOPE]
const uuidSchema = z.string().uuid()

export interface PublicDocumentationScope {
  readonly projectId: string
  readonly projectName: string
  readonly rootDocumentId: string
  readonly scope: ShareScope
  readonly documents: readonly PublicDocumentCandidate[]
}

export interface PublicDocumentImageMetadata {
  readonly objectKey: string
  readonly filename: string
  readonly mimeType: string
}

export interface PublicDocumentationRepository {
  readonly loadScope: (tokenHash: string) => Promise<PublicDocumentationScope | null>
  readonly loadImageMetadata: (
    projectId: string,
    imageId: string,
  ) => Promise<PublicDocumentImageMetadata | null>
}

interface Dependencies {
  readonly repository: PublicDocumentationRepository
}

export const createPublicDocumentationService = ({ repository }: Dependencies) => {
  const load = async (token: string): Promise<PublicDocumentationScope | null> => {
    const parsed = documentPublicShareTokenSchema.safeParse(token)
    if (!parsed.success) return null
    try {
      return await repository.loadScope(hashDocumentPublicShareToken(parsed.data))
    }
    catch {
      return null
    }
  }

  return Object.freeze({
    async readPage(input: Readonly<{
      token: string
      selectedDocumentId: string | null
    }>): Promise<PublicDocumentationResponse | null> {
      if (input.selectedDocumentId !== null && !uuidSchema.safeParse(input.selectedDocumentId).success) return null
      const scope = await load(input.token)
      if (!scope) return null
      const derived = derivePublicDocumentProjection({
        scope: scope.scope,
        rootDocumentId: scope.rootDocumentId,
        selectedDocumentId: input.selectedDocumentId ?? scope.rootDocumentId,
        documents: scope.documents,
      })
      return derived ? {
        scope: scope.scope,
        rootDocumentId: scope.rootDocumentId,
        projectName: scope.projectName,
        page: derived.page,
        tree: derived.tree,
      } : null
    },

    async resolveImage(input: Readonly<{
      token: string
      imageId: string
    }>): Promise<PublicDocumentImageMetadata | null> {
      if (!uuidSchema.safeParse(input.imageId).success) return null
      const scope = await load(input.token)
      if (!scope) return null
      const derived = derivePublicDocumentProjection({
        scope: scope.scope,
        rootDocumentId: scope.rootDocumentId,
        selectedDocumentId: scope.rootDocumentId,
        documents: scope.documents,
      })
      if (!derived?.referencedImageIds.includes(input.imageId)) return null
      try {
        return await repository.loadImageMetadata(scope.projectId, input.imageId)
      }
      catch {
        return null
      }
    },
  })
}
