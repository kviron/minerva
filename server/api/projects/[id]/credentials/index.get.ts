import { defineEventHandler, getQuery, getRouterParam, setHeader } from 'h3'
import { getDatabase } from '../../../../infrastructure/database/client'
import { listAccessibleCredentials } from '../../../../modules/credentials/credentials'
import { getCredentialCrypto } from '../../../../modules/credentials/runtime'
import { requireSession } from '../../../../modules/identity/session/require-session'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event) as { user: { id: string } }
  setHeader(event, 'Cache-Control', 'no-store')
  const projectId = getRouterParam(event, 'id') ?? ''
  const category = getQuery(event).category
  return await listAccessibleCredentials(getDatabase().db, getCredentialCrypto(), {
    actorUserId: session.user.id,
    projectId,
    categoryId: typeof category === 'string' ? category : null,
  })
})
