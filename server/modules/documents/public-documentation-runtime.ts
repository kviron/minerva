import { getDatabase } from '../../infrastructure/database/client'
import { createS3DocumentImageStorage } from '../../infrastructure/storage/s3-document-images'
import { createPublicDocumentationRepository } from './public-documentation-repository'
import { createPublicDocumentationService } from './public-documentation'

export const getPublicDocumentationRuntime = () => {
  const { db } = getDatabase()
  return {
    service: createPublicDocumentationService({
      repository: createPublicDocumentationRepository(db),
    }),
    imageStorage: createS3DocumentImageStorage(),
  }
}
