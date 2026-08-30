import { getCredentialEncryptionEnv } from '../../config/runtime-env'
import { createCredentialCrypto } from './crypto'

let runtimeCrypto: ReturnType<typeof createCredentialCrypto> | undefined

export const getCredentialCrypto = () => {
  if (runtimeCrypto) return runtimeCrypto
  const env = getCredentialEncryptionEnv()
  runtimeCrypto = createCredentialCrypto({
    activeVersion: env.CREDENTIAL_ENCRYPTION_ACTIVE_KEY_VERSION,
    keys: env.CREDENTIAL_ENCRYPTION_KEYS,
  })
  return runtimeCrypto
}
