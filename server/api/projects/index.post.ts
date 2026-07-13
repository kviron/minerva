import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { AUDIT_CHANNEL } from '../../../shared/projects/constants'
import type { AccountStatus } from '../../../shared/identity/types'
import { requireSession } from '../../modules/identity/session/require-session'
import { CREATE_PROJECT_ERROR, createProject } from '../../modules/projects/create-project'

interface ProjectSession {
  readonly user: { readonly id: string, readonly status: AccountStatus }
}

const isBody = (value: unknown): value is { name: string, description?: string | null } => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const body = value as Record<string, unknown>
  if (!Object.keys(body).every(key => key === 'name' || key === 'description')) return false
  return typeof body.name === 'string'
    && (body.description === undefined || body.description === null || typeof body.description === 'string')
}

export default defineEventHandler(async (event) => {
  const session = await requireSession(event) as ProjectSession
  const body: unknown = await readBody(event)
  if (!isBody(body)) {
    setResponseStatus(event, 400)
    return { data: { code: CREATE_PROJECT_ERROR.INVALID_PROJECT_NAME } }
  }

  const result = await createProject({
    actor: { userId: session.user.id, accountStatus: session.user.status },
    channel: AUDIT_CHANNEL.WEB,
    name: body.name,
    description: body.description,
  })

  if (result.ok) return result.value

  const status = result.code === CREATE_PROJECT_ERROR.PROJECT_CREATE_FAILED ? 503
    : result.code === CREATE_PROJECT_ERROR.AUTH_REQUIRED ? 401
      : result.code === CREATE_PROJECT_ERROR.ACCOUNT_INACTIVE ? 403 : 400
  setResponseStatus(event, status)
  return { data: { code: result.code } }
})
