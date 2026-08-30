import { defineStore } from 'pinia'
import type {
  ProjectAiConversation,
  ProjectAiConversationMessage,
  ProjectAssistantCitation,
} from '../../../../shared/ai-assistant/contracts'

export const PROJECT_ASSISTANT_MESSAGE_ROLE = {
  USER: 'user',
  ASSISTANT: 'assistant',
} as const

export const PROJECT_ASSISTANT_MESSAGE_STATUS = {
  STREAMING: 'streaming',
  COMPLETED: 'completed',
  ERROR: 'error',
  CANCELLED: 'cancelled',
} as const

type ProjectAssistantMessageRole = typeof PROJECT_ASSISTANT_MESSAGE_ROLE[keyof typeof PROJECT_ASSISTANT_MESSAGE_ROLE]
type ProjectAssistantMessageStatus = typeof PROJECT_ASSISTANT_MESSAGE_STATUS[keyof typeof PROJECT_ASSISTANT_MESSAGE_STATUS]

export interface ProjectAssistantMessage {
  readonly id: string
  readonly role: ProjectAssistantMessageRole
  readonly content: string
  readonly status: ProjectAssistantMessageStatus
  readonly citations: readonly ProjectAssistantCitation[]
}

interface ProjectAssistantState {
  projectId: string | null
  conversationId: string | null
  isOpen: boolean
  messages: ProjectAssistantMessage[]
  activeAssistantMessageId: string | null
  retryQuestion: string | null
  error: string | null
  conversations: ProjectAiConversation[]
  conversationsNextCursor: string | null
  messagesNextCursor: string | null
}

interface StartTurnInput {
  readonly userMessageId: string
  readonly assistantMessageId: string
  readonly question: string
}

const copyCitations = (citations: readonly ProjectAssistantCitation[]): readonly ProjectAssistantCitation[] =>
  citations.map(citation => ({ ...citation }))

export const useProjectAssistantStore = defineStore('project-assistant', {
  state: (): ProjectAssistantState => ({
    projectId: null,
    conversationId: null,
    isOpen: false,
    messages: [],
    activeAssistantMessageId: null,
    retryQuestion: null,
    error: null,
    conversations: [],
    conversationsNextCursor: null,
    messagesNextCursor: null,
  }),
  actions: {
    activateProject(projectId: string): void {
      if (this.projectId === projectId) return
      this.projectId = projectId
      this.conversationId = null
      this.isOpen = false
      this.messages = []
      this.activeAssistantMessageId = null
      this.retryQuestion = null
      this.error = null
      this.conversations = []
      this.conversationsNextCursor = null
      this.messagesNextCursor = null
    },
    open(projectId: string): void {
      this.activateProject(projectId)
      this.isOpen = true
    },
    close(): void {
      this.isOpen = false
    },
    newConversation(projectId: string): void {
      this.activateProject(projectId)
      this.isOpen = true
      this.messages = []
      this.conversationId = null
      this.activeAssistantMessageId = null
      this.retryQuestion = null
      this.error = null
      this.messagesNextCursor = null
    },
    selectConversation(conversationId: string): void {
      this.conversationId = conversationId
      this.messages = []
      this.messagesNextCursor = null
      this.error = null
      this.retryQuestion = null
    },
    setConversations(conversations: readonly ProjectAiConversation[], nextCursor: string | null, append = false): void {
      this.conversations = append ? [...this.conversations, ...conversations] : [...conversations]
      this.conversationsNextCursor = nextCursor
    },
    hydrateMessages(messages: readonly ProjectAiConversationMessage[], nextCursor: string | null, prepend = false): void {
      const projected = messages.map(message => ({
        id: message.id,
        role: message.role,
        content: message.content,
        status: PROJECT_ASSISTANT_MESSAGE_STATUS.COMPLETED,
        citations: copyCitations(message.citations),
      }))
      this.messages = prepend ? [...projected, ...this.messages] : projected
      this.messagesNextCursor = nextCursor
    },
    startTurn(input: StartTurnInput): void {
      this.error = null
      this.retryQuestion = null
      this.activeAssistantMessageId = input.assistantMessageId
      this.messages = [
        ...this.messages,
        {
          id: input.userMessageId,
          role: PROJECT_ASSISTANT_MESSAGE_ROLE.USER,
          content: input.question,
          status: PROJECT_ASSISTANT_MESSAGE_STATUS.COMPLETED,
          citations: [],
        },
        {
          id: input.assistantMessageId,
          role: PROJECT_ASSISTANT_MESSAGE_ROLE.ASSISTANT,
          content: '',
          status: PROJECT_ASSISTANT_MESSAGE_STATUS.STREAMING,
          citations: [],
        },
      ]
    },
    setTurnCitations(messageId: string, citations: readonly ProjectAssistantCitation[]): void {
      this.messages = this.messages.map(message => message.id === messageId
        ? { ...message, citations: copyCitations(citations) }
        : message)
    },
    appendDelta(messageId: string, delta: string): void {
      this.messages = this.messages.map(message => message.id === messageId
        ? { ...message, content: `${message.content}${delta}` }
        : message)
    },
    completeTurn(messageId: string, citations: readonly ProjectAssistantCitation[]): void {
      this.messages = this.messages.map(message => message.id === messageId
        ? {
            ...message,
            status: PROJECT_ASSISTANT_MESSAGE_STATUS.COMPLETED,
            citations: copyCitations(citations),
          }
        : message)
      if (this.activeAssistantMessageId === messageId) this.activeAssistantMessageId = null
      this.error = null
      this.retryQuestion = null
    },
    failTurn(messageId: string, error: string): void {
      this.messages = this.messages.map(message => message.id === messageId
        ? { ...message, status: PROJECT_ASSISTANT_MESSAGE_STATUS.ERROR }
        : message)
      if (this.activeAssistantMessageId === messageId) this.activeAssistantMessageId = null
      this.error = error
      this.retryQuestion = [...this.messages].reverse()
        .find(message => message.role === PROJECT_ASSISTANT_MESSAGE_ROLE.USER)?.content ?? null
    },
    cancelTurn(messageId: string): void {
      this.messages = this.messages.map(message => message.id === messageId
        ? { ...message, status: PROJECT_ASSISTANT_MESSAGE_STATUS.CANCELLED }
        : message)
      if (this.activeAssistantMessageId === messageId) this.activeAssistantMessageId = null
      this.error = null
      this.retryQuestion = [...this.messages].reverse()
        .find(message => message.role === PROJECT_ASSISTANT_MESSAGE_ROLE.USER)?.content ?? null
    },
  },
})
