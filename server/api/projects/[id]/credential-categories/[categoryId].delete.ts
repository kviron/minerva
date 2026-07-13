import { defineEventHandler, getRouterParam, setResponseStatus } from 'h3'
import { AUDIT_CHANNEL } from '../../../../../shared/projects/constants'
import { getDatabase } from '../../../../infrastructure/database/client'
import { archiveCredentialCategory, CREDENTIAL_CATEGORY_ERROR } from '../../../../modules/credentials/categories'
import { requireSession } from '../../../../modules/identity/session/require-session'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event) as { user: { id: string } }
  const result = await archiveCredentialCategory(getDatabase().db, {
    actorUserId: session.user.id,
    projectId: getRouterParam(event, 'id') ?? '',
    categoryId: getRouterParam(event, 'categoryId') ?? '',
    channel: AUDIT_CHANNEL.WEB,
  })
  if (result.ok) return { ok: true }
  setResponseStatus(event, result.code === CREDENTIAL_CATEGORY_ERROR.CATEGORY_NOT_FOUND ? 404 : 503)
  return { data: { code: result.code } }
})
