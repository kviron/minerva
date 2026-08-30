import { createError } from 'h3'
import { PROJECT_AI_CONNECTION_ERROR } from './project-ai-connections'
import { ASSISTANT_TURN_ERROR } from './assistant-turn'
import { PROJECT_AI_CONVERSATION_ERROR } from './project-ai-conversations'

export const projectAiConversationHttpError = (
  _code: typeof PROJECT_AI_CONVERSATION_ERROR[keyof typeof PROJECT_AI_CONVERSATION_ERROR],
) => createError({
  statusCode: 404,
  statusMessage: 'Not found',
})

export const projectAiConnectionHttpError = (
  code: typeof PROJECT_AI_CONNECTION_ERROR[keyof typeof PROJECT_AI_CONNECTION_ERROR],
) => {
  if (code === PROJECT_AI_CONNECTION_ERROR.PERMISSION_DENIED) {
    return createError({ statusCode: 404, statusMessage: 'Not found' })
  }
  if (code === PROJECT_AI_CONNECTION_ERROR.NOT_CONFIGURED) {
    return createError({ statusCode: 409, statusMessage: 'AI provider is not configured' })
  }
  return createError({ statusCode: 503, statusMessage: 'AI provider connection unavailable' })
}

export const projectAssistantTurnHttpError = (
  code: typeof ASSISTANT_TURN_ERROR[keyof typeof ASSISTANT_TURN_ERROR],
) => {
  if (code === ASSISTANT_TURN_ERROR.INVALID_INPUT) {
    return createError({ statusCode: 400, statusMessage: 'Invalid assistant question' })
  }
  if (code === ASSISTANT_TURN_ERROR.PERMISSION_DENIED) {
    return createError({ statusCode: 404, statusMessage: 'Not found' })
  }
  if (code === ASSISTANT_TURN_ERROR.CONNECTION_UNAVAILABLE) {
    return createError({ statusCode: 409, statusMessage: 'AI provider is not available' })
  }
  if (code === ASSISTANT_TURN_ERROR.TURN_IN_PROGRESS) {
    return createError({ statusCode: 409, statusMessage: 'AI assistant turn is already in progress' })
  }
  if (code === ASSISTANT_TURN_ERROR.RATE_LIMITED) {
    return createError({ statusCode: 429, statusMessage: 'AI assistant rate limit exceeded' })
  }
  return createError({ statusCode: 503, statusMessage: 'AI assistant unavailable' })
}
