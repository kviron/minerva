import { getCredentialEncryptionEnv, getServerEnv } from '../../config/runtime-env'
import { getDatabase } from '../../infrastructure/database/client'
import { createDocumentPublicShareRepository } from './document-public-share-repository'
import { createDocumentPublicShareManagementService } from './document-public-shares'
import { createDocumentPublicShareCrypto } from './public-share-crypto'

export const getDocumentPublicShareManagementService = () => {
  const serverEnv = getServerEnv()
  const encryptionEnv = getCredentialEncryptionEnv()
  const { db } = getDatabase()

  return createDocumentPublicShareManagementService({
    repository: createDocumentPublicShareRepository(db),
    crypto: createDocumentPublicShareCrypto({
      activeVersion: encryptionEnv.CREDENTIAL_ENCRYPTION_ACTIVE_KEY_VERSION,
      keys: encryptionEnv.CREDENTIAL_ENCRYPTION_KEYS,
    }),
    publicBaseUrl: new URL('/', serverEnv.BETTER_AUTH_URL).toString(),
  })
}
