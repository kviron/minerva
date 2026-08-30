import {
  createError,
  createEventStream,
  defineEventHandler,
  getValidatedRouterParams,
  readValidatedBody,
  setHeader,
} from 'h3'
import {
  projectAiRouteParamsSchema,
  projectAssistantStreamEventSchema,
  projectAssistantTurnRequestSchema,
} from '../../../../../../shared/ai-assistant/contracts'
import { projectAssistantTurnHttpError } from '../../../../../modules/ai-assistant/http'
import { getProjectAssistantStreamService } from '../../../../../modules/ai-assistant/runtime'
import { requireSession } from '../../../../../modules/identity/session/require-session'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  let params
  let body
  try {
    params = await getValidatedRouterParams(event, value => projectAiRouteParamsSchema.parse(value))
    body = await readValidatedBody(event, value => projectAssistantTurnRequestSchema.parse(value))
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid assistant question' })
  }

  const session = await requireSession(event)
  const cancellation = new AbortController()
  const result = await getProjectAssistantStreamService().stream({
    projectId: params.id,
    actorUserId: session.user.id,
    question: body.question,
    conversationId: body.conversationId,
    signal: cancellation.signal,
  })
  if (!result.ok) {
    throw projectAssistantTurnHttpError(result.code)
  }

  const stream = createEventStream(event)
  stream.onClosed(() => cancellation.abort())
  const pumping = (async () => {
    try {
      for await (const value of result.events) {
        const safeEvent = projectAssistantStreamEventSchema.parse(value)
        await stream.push({
          event: safeEvent.type,
          data: JSON.stringify(safeEvent),
        })
      }
    }
    finally {
      await stream.close()
    }
  })()

  await Promise.all([stream.send(), pumping])
})
