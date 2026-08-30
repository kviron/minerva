import { getCredentialEncryptionEnv } from '../../config/runtime-env'
import { createProjectAiCrypto } from './crypto'
import { getDatabase } from '../../infrastructure/database/client'
import { authorizeCurrentProjectAssistant } from './authorize-project-assistant'
import { createProjectAiConnectionService } from './project-ai-connections'
import { createProjectAiConnectionRepository } from './project-ai-connection-repository'
import { createProjectAiProviderTester } from './openai-connection-test'
import { createProjectAssistantTurnService } from './assistant-turn'
import { createOpenAiResponsesAdapter } from './openai-responses'
import { searchCurrentUserDocuments } from '../documents/search-documents'
import { createProjectAssistantStreamService } from './assistant-stream'
import { createOpenAiResponsesStreamingAdapter } from './openai-responses-streaming'
import { createAssistantTurnLifecycle } from './assistant-turn-lifecycle'
import { createAssistantTurnPersistence } from './assistant-turn-persistence'
import { createProjectAiConversationRepository } from './project-ai-conversation-repository'
import { createProjectAiConversationService } from './project-ai-conversations'
import {
  assistantDocumentToolDefinitions,
  createAssistantDocumentToolExecutor,
} from './assistant-document-tools'
import {
  getDocumentForUser,
  listDocumentTreeForUser,
} from '../documents/read-documents'
import { searchDocumentsForUser } from '../documents/search-documents'
import { getDocumentVersionForUser } from '../documents/document-versions'

let runtimeCrypto: ReturnType<typeof createProjectAiCrypto> | undefined

export const getProjectAiCrypto = () => {
  if (runtimeCrypto) return runtimeCrypto
  const env = getCredentialEncryptionEnv()
  runtimeCrypto = createProjectAiCrypto({
    activeVersion: env.CREDENTIAL_ENCRYPTION_ACTIVE_KEY_VERSION,
    keys: env.CREDENTIAL_ENCRYPTION_KEYS,
  })
  return runtimeCrypto
}

export const getProjectAiConnectionService = () => createProjectAiConnectionService({
  authorize: authorizeCurrentProjectAssistant,
  repository: createProjectAiConnectionRepository(getDatabase().db),
  crypto: getProjectAiCrypto(),
  testProvider: createProjectAiProviderTester(),
})

export const getProjectAiConversationService = () => createProjectAiConversationService({
  authorize: authorizeCurrentProjectAssistant,
  repository: createProjectAiConversationRepository(getDatabase().db),
})

export const getProjectAssistantTurnService = () => {
  const db = getDatabase().db
  const repository = createProjectAiConnectionRepository(db)
  const crypto = getProjectAiCrypto()
  const persistence = createAssistantTurnPersistence(db)
  const createToolExecutor = (projectId: string, actorUserId: string) =>
    createAssistantDocumentToolExecutor({ projectId, actorUserId }, {
      search: (targetProjectId, userId, query) => searchDocumentsForUser(db, targetProjectId, userId, query),
      read: (targetProjectId, documentId, userId) => getDocumentForUser(db, targetProjectId, documentId, userId),
      listTree: (targetProjectId, userId) => listDocumentTreeForUser(db, targetProjectId, userId),
      readVersion: (targetProjectId, documentId, versionNumber, userId) =>
        getDocumentVersionForUser(db, targetProjectId, documentId, versionNumber, userId),
    })
  return createProjectAssistantTurnService({
    authorize: authorizeCurrentProjectAssistant,
    loadConnection: repository.load,
    decryptApiKey: connection => crypto.decrypt({
      ciphertext: connection.apiKeyCiphertext,
      nonce: connection.apiKeyNonce,
      keyVersion: connection.apiKeyKeyVersion,
    }, {
      projectId: connection.projectId,
      connectionId: connection.id,
    }),
    searchDocuments: searchCurrentUserDocuments,
    generate: createOpenAiResponsesAdapter(),
    lifecycle: createAssistantTurnLifecycle(persistence),
    tools: assistantDocumentToolDefinitions,
    createToolExecutor,
  })
}

export const getProjectAssistantStreamService = () => {
  const db = getDatabase().db
  const repository = createProjectAiConnectionRepository(db)
  const crypto = getProjectAiCrypto()
  const persistence = createAssistantTurnPersistence(db)
  const conversations = createProjectAiConversationService({
    authorize: authorizeCurrentProjectAssistant,
    repository: createProjectAiConversationRepository(db),
  })
  const createToolExecutor = (projectId: string, actorUserId: string) =>
    createAssistantDocumentToolExecutor({ projectId, actorUserId }, {
      search: (targetProjectId, userId, query) => searchDocumentsForUser(db, targetProjectId, userId, query),
      read: (targetProjectId, documentId, userId) => getDocumentForUser(db, targetProjectId, documentId, userId),
      listTree: (targetProjectId, userId) => listDocumentTreeForUser(db, targetProjectId, userId),
      readVersion: (targetProjectId, documentId, versionNumber, userId) =>
        getDocumentVersionForUser(db, targetProjectId, documentId, versionNumber, userId),
    })
  return createProjectAssistantStreamService({
    authorize: authorizeCurrentProjectAssistant,
    loadConnection: repository.load,
    decryptApiKey: connection => crypto.decrypt({
      ciphertext: connection.apiKeyCiphertext,
      nonce: connection.apiKeyNonce,
      keyVersion: connection.apiKeyKeyVersion,
    }, {
      projectId: connection.projectId,
      connectionId: connection.id,
    }),
    searchDocuments: searchCurrentUserDocuments,
    streamAnswer: createOpenAiResponsesStreamingAdapter(),
    lifecycle: createAssistantTurnLifecycle(persistence),
    appendConversationMessage: input => conversations.appendMessage(input),
    tools: assistantDocumentToolDefinitions,
    createToolExecutor,
  })
}
