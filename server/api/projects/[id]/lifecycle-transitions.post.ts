import {
  defineEventHandler,
  getValidatedRouterParams,
  readValidatedBody,
  setHeader,
  setResponseStatus,
} from 'h3'
import { AUDIT_CHANNEL } from '../../../../shared/projects/constants'
import {
  projectLifecycleTransitionRequestSchema,
  projectRouteParamsSchema,
} from '../../../../shared/projects/contracts'
import { requireSession } from '../../../modules/identity/session/require-session'
import {
  PROJECT_LIFECYCLE_TRANSITION_ERROR,
  transitionProjectLifecycle,
} from '../../../modules/projects/transition-project-lifecycle'
import { projectLifecycleTransitionHttpStatus } from '../../../utils/project-lifecycle-transition-http'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')

  let params
  let body
  try {
    params = await getValidatedRouterParams(event, value => projectRouteParamsSchema.parse(value))
  } catch {
    setResponseStatus(event, 404)
    return { data: { code: PROJECT_LIFECYCLE_TRANSITION_ERROR.NOT_FOUND } }
  }
  try {
    body = await readValidatedBody(event, value => projectLifecycleTransitionRequestSchema.parse(value))
  } catch {
    setResponseStatus(event, 400)
    return { data: { code: 'INVALID_REQUEST' } }
  }

  const session = await requireSession(event)
  const result = await transitionProjectLifecycle({
    actorUserId: session.user.id,
    projectId: params.id,
    channel: AUDIT_CHANNEL.WEB,
    ...body,
  })
  if (result.ok) return result.value

  setResponseStatus(event, projectLifecycleTransitionHttpStatus(result.code))
  return 'conflict' in result
    ? { data: { code: result.code, ...result.conflict } }
    : { data: { code: result.code } }
})
