import { defineEventHandler, readValidatedBody, setHeader, setResponseStatus } from 'h3'
import { AUDIT_CHANNEL, CREATE_PROJECT_ERROR } from '../../../shared/projects/constants'
import { createProjectRequestSchema } from '../../../shared/projects/contracts'
import { requireSession } from '../../modules/identity/session/require-session'
import { createProject } from '../../modules/projects/create-project'
import { createProjectHttpStatus } from '../../utils/create-project-http'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const session = await requireSession(event)
  let body
  try {
    body = await readValidatedBody(event, value => createProjectRequestSchema.parse(value))
  }
  catch {
    setResponseStatus(event, 400)
    return { data: { code: CREATE_PROJECT_ERROR.INVALID_REQUEST } }
  }

  const result = await createProject({
    actor: { userId: session.user.id, accountStatus: session.user.status },
    channel: AUDIT_CHANNEL.WEB,
    name: body.name,
    description: body.description,
  })

  if (result.ok) return result.value

  setResponseStatus(event, createProjectHttpStatus(result.code))
  return { data: { code: result.code } }
})
