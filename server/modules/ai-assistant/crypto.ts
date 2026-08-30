import {
  createVersionedSecretCrypto,
  type VersionedSecretConfig,
  type VersionedSecretEnvelope,
} from '../encryption/versioned-secret'

export interface ProjectAiSecretContext {
  readonly projectId: string
  readonly connectionId: string
}

export type ProjectAiSecretEnvelope = VersionedSecretEnvelope

export class ProjectAiDecryptionError extends Error {
  constructor() {
    super('AI provider connection unavailable')
    this.name = 'ProjectAiDecryptionError'
  }
}

export const serializeProjectAiSecretContext = (context: ProjectAiSecretContext): string => [
  'minerva:project-ai-connection:v1',
  context.projectId,
  context.connectionId,
  'api-key',
].join('|')

export const createProjectAiCrypto = (config: VersionedSecretConfig) => {
  const crypto = createVersionedSecretCrypto(config, serializeProjectAiSecretContext)
  return Object.freeze({
    encrypt: crypto.encrypt,
    decrypt(envelope: ProjectAiSecretEnvelope, context: ProjectAiSecretContext): string {
      try {
        return crypto.decrypt(envelope, context)
      }
      catch {
        throw new ProjectAiDecryptionError()
      }
    },
  })
}
