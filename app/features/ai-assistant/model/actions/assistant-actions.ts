import type { ProjectAssistantStreamEvent } from '../../../../../shared/ai-assistant/contracts'
import { BaseActions, type BaseActionsOptions } from '@/shared/model/baseActions'
import { projectAssistantTurnsApi } from '../../api/assistant-turns-api'
import { projectAiConversationsApi } from '../../api/project-ai-conversations-api'
import { projectAiConnectionsApi } from '../../api/project-ai-connections-api'
import type { AI_CONVERSATION_STATUS } from '../../../../../shared/ai-assistant/constants'

export const PROJECT_ASSISTANT_ACTION = {
  OPEN: 'project-assistant.open',
  NEW_CONVERSATION: 'project-assistant.new-conversation',
  SEND: 'project-assistant.send',
  CANCEL: 'project-assistant.cancel',
  RETRY: 'project-assistant.retry',
  CREATE_CONVERSATION: 'project-assistant.create-conversation',
  LIST_CONVERSATIONS: 'project-assistant.list-conversations',
  LOAD_MESSAGES: 'project-assistant.load-messages',
  LOAD_AVAILABILITY: 'project-assistant.load-availability',
  ARCHIVE_CONVERSATION: 'project-assistant.archive-conversation',
  RESTORE_CONVERSATION: 'project-assistant.restore-conversation',
} as const

export interface ProjectAssistantUiCommand {
  readonly type: typeof PROJECT_ASSISTANT_ACTION.OPEN | typeof PROJECT_ASSISTANT_ACTION.NEW_CONVERSATION
  readonly projectId: string
}

type ProjectAssistantEventHandler = (event: ProjectAssistantStreamEvent) => void

interface ProjectAssistantActionDependencies {
  readonly turnsApi?: typeof projectAssistantTurnsApi
  readonly conversationsApi?: typeof projectAiConversationsApi
  readonly connectionsApi?: typeof projectAiConnectionsApi
}

export class ProjectAssistantActions extends BaseActions {
  private readonly turnsApi: typeof projectAssistantTurnsApi
  private readonly conversationsApi: typeof projectAiConversationsApi
  private readonly connectionsApi: typeof projectAiConnectionsApi

  constructor(options: BaseActionsOptions = {}, dependencies: ProjectAssistantActionDependencies = {}) {
    super({ ...options, analyticsTag: options.analyticsTag ?? 'project-assistant' })
    this.turnsApi = dependencies.turnsApi ?? projectAssistantTurnsApi
    this.conversationsApi = dependencies.conversationsApi ?? projectAiConversationsApi
    this.connectionsApi = dependencies.connectionsApi ?? projectAiConnectionsApi
  }

  public open = this.createSyncAction({
    name: PROJECT_ASSISTANT_ACTION.OPEN,
    run: (projectId: string): ProjectAssistantUiCommand => ({
      type: PROJECT_ASSISTANT_ACTION.OPEN,
      projectId,
    }),
    idGetter: projectId => projectId,
    options: { mutation: false },
  })

  public newConversation = this.createSyncAction({
    name: PROJECT_ASSISTANT_ACTION.NEW_CONVERSATION,
    run: (projectId: string): ProjectAssistantUiCommand => ({
      type: PROJECT_ASSISTANT_ACTION.NEW_CONVERSATION,
      projectId,
    }),
    idGetter: projectId => projectId,
    options: { mutation: false },
  })

  public send = this.createAsyncAction({
    name: PROJECT_ASSISTANT_ACTION.SEND,
    run: async (
      signal: AbortSignal,
      projectId: string,
      conversationId: string,
      question: string,
      onEvent: ProjectAssistantEventHandler,
    ): Promise<void> => {
      for await (const event of this.turnsApi.stream(projectId, conversationId, question, signal)) {
        onEvent(event)
      }
    },
    idGetter: projectId => projectId,
    options: {
      concurrency: 'abort',
      mutation: false,
      errorMessage: 'Не удалось получить ответ AI-помощника.',
    },
  })

  public createConversation = this.createAsyncAction({
    name: PROJECT_ASSISTANT_ACTION.CREATE_CONVERSATION,
    run: (signal: AbortSignal, projectId: string) => this.conversationsApi.create(projectId, signal),
    idGetter: projectId => projectId,
  })

  public loadAvailability = this.createAsyncAction({
    name: PROJECT_ASSISTANT_ACTION.LOAD_AVAILABILITY,
    run: (signal: AbortSignal, projectId: string) =>
      this.connectionsApi.loadAvailability(projectId, signal),
    idGetter: projectId => projectId,
    options: {
      concurrency: 'abort',
      mutation: false,
      errorMessage: 'Не удалось проверить готовность AI-помощника.',
    },
  })

  public listConversations = this.createAsyncAction({
    name: PROJECT_ASSISTANT_ACTION.LIST_CONVERSATIONS,
    run: (
      signal: AbortSignal,
      projectId: string,
      status: typeof AI_CONVERSATION_STATUS[keyof typeof AI_CONVERSATION_STATUS],
      cursor: string | undefined,
    ) => this.conversationsApi.list(projectId, status, cursor, signal),
    idGetter: (projectId, status) => `${projectId}:${status}`,
    options: { concurrency: 'abort', mutation: false },
  })

  public loadMessages = this.createAsyncAction({
    name: PROJECT_ASSISTANT_ACTION.LOAD_MESSAGES,
    run: (signal: AbortSignal, projectId: string, conversationId: string, cursor: string | undefined) =>
      this.conversationsApi.messages(projectId, conversationId, cursor, signal),
    idGetter: (_projectId, conversationId) => conversationId,
    options: { concurrency: 'abort', mutation: false },
  })

  public archiveConversation = this.createAsyncAction({
    name: PROJECT_ASSISTANT_ACTION.ARCHIVE_CONVERSATION,
    run: (signal: AbortSignal, projectId: string, conversationId: string) =>
      this.conversationsApi.archive(projectId, conversationId, signal),
    idGetter: (_projectId, conversationId) => conversationId,
  })

  public restoreConversation = this.createAsyncAction({
    name: PROJECT_ASSISTANT_ACTION.RESTORE_CONVERSATION,
    run: (signal: AbortSignal, projectId: string, conversationId: string) =>
      this.conversationsApi.restore(projectId, conversationId, signal),
    idGetter: (_projectId, conversationId) => conversationId,
  })

  public cancel(projectId: string): void {
    this.cancelPending(PROJECT_ASSISTANT_ACTION.SEND, projectId)
  }

  public retry(
    projectId: string,
    conversationId: string,
    question: string,
    onEvent: ProjectAssistantEventHandler,
  ): Promise<void | undefined> {
    return this.send(projectId, conversationId, question, onEvent)
  }
}
