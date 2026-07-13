import { defineEventHandler, getRouterParam, setResponseStatus } from 'h3'
import { AUDIT_CHANNEL } from '../../../../../shared/projects/constants'
import { getDatabase } from '../../../../infrastructure/database/client'
import { archiveCredential, CREDENTIAL_ERROR } from '../../../../modules/credentials/credentials'
import { requireSession } from '../../../../modules/identity/session/require-session'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event) as { user: { id: string } }
  const result = await archiveCredential(getDatabase().db, {
    actorUserId: session.user.id,
    projectId: getRouterParam(event, 'id') ?? '',
    credentialId: getRouterParam(event, 'credentialId') ?? '',
    channel: AUDIT_CHANNEL.WEB,
  })
  if (result.ok) return { ok: true }
  setResponseStatus(event, result.code === CREDENTIAL_ERROR.NOT_FOUND ? 404 : 503)
  return { data: { code: result.code } }
})
