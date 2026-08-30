import type {
  ProjectAiConversationListResponse,
  ProjectAiConversationMessagesResponse,
} from '../../../../shared/ai-assistant/contracts'
import {
  projectAiConversationCreateResponseSchema,
  projectAiConversationListResponseSchema,
  projectAiConversationMessagesResponseSchema,
  projectAiConversationMutationResponseSchema,
} from '../../../../shared/ai-assistant/contracts'
import type { AI_CONVERSATION_STATUS } from '../../../../shared/ai-assistant/constants'
import { decodeApiResponse } from '../../../shared/api/decode-api-response'

interface RequestOptions {
  readonly method?: 'GET' | 'POST' | 'DELETE'
  readonly query?: Readonly<Record<string, string | number | undefined>>
  readonly signal?: AbortSignal
}

export type ProjectAiConversationsRequest = (path: string, options?: RequestOptions) => Promise<unknown>

export const createProjectAiConversationsApi = (request: ProjectAiConversationsRequest) => ({
  async create(projectId: string, signal?: AbortSignal) {
    const response = await request(`/api/projects/${projectId}/ai-assistant/conversations`, { method: 'POST', signal })
    return decodeApiResponse(projectAiConversationCreateResponseSchema, response, 'POST project AI conversation')
  },

  async list(
    projectId: string,
    status: typeof AI_CONVERSATION_STATUS[keyof typeof AI_CONVERSATION_STATUS],
    cursor?: string,
    signal?: AbortSignal,
  ): Promise<ProjectAiConversationListResponse> {
    const response = await request(`/api/projects/${projectId}/ai-assistant/conversations`, {
      query: { status, cursor },
      signal,
    })
    return decodeApiResponse(projectAiConversationListResponseSchema, response, 'GET project AI conversations')
  },

  async messages(
    projectId: string,
    conversationId: string,
    cursor?: string,
    signal?: AbortSignal,
  ): Promise<ProjectAiConversationMessagesResponse> {
    const response = await request(
      `/api/projects/${projectId}/ai-assistant/conversations/${conversationId}`,
      { query: { cursor }, signal },
    )
    return decodeApiResponse(projectAiConversationMessagesResponseSchema, response, 'GET project AI conversation')
  },

  async archive(projectId: string, conversationId: string, signal?: AbortSignal) {
    const response = await request(
      `/api/projects/${projectId}/ai-assistant/conversations/${conversationId}`,
      { method: 'DELETE', signal },
    )
    return decodeApiResponse(projectAiConversationMutationResponseSchema, response, 'DELETE project AI conversation')
  },

  async restore(projectId: string, conversationId: string, signal?: AbortSignal) {
    const response = await request(
      `/api/projects/${projectId}/ai-assistant/conversations/${conversationId}/restore`,
      { method: 'POST', signal },
    )
    return decodeApiResponse(projectAiConversationMutationResponseSchema, response, 'POST restore project AI conversation')
  },
})

const runtimeRequest: ProjectAiConversationsRequest = (path, options) => $fetch<unknown>(path, options)
export const projectAiConversationsApi = createProjectAiConversationsApi(runtimeRequest)
