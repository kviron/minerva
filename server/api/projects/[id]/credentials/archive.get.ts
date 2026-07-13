import { defineEventHandler, getRouterParam, setHeader } from 'h3'
import { getDatabase } from '../../../../infrastructure/database/client'
import { listAccessibleArchivedCredentials } from '../../../../modules/credentials/credentials'
import { requireSession } from '../../../../modules/identity/session/require-session'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event) as { user: { id: string } }
  setHeader(event, 'Cache-Control', 'no-store')
  const projectId = getRouterParam(event, 'id') ?? ''
  return await listAccessibleArchivedCredentials(getDatabase().db, {
    actorUserId: session.user.id,
    projectId,
  })
})
