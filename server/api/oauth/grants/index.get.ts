import { defineEventHandler, setHeader } from 'h3'
import { getDatabase } from '../../../infrastructure/database/client'
import { createOAuthGrantManagement } from '../../../modules/identity/oauth-grants'
import { requireSession } from '../../../modules/identity/session/require-session'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const session = await requireSession(event)
  return createOAuthGrantManagement(getDatabase().db).listActive(session.user.id)
})
