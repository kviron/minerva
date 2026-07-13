import { defineEventHandler, getRouterParam } from 'h3'
import { getDatabase } from '../../../../infrastructure/database/client'
import { getCredentialCategoryManagement } from '../../../../modules/credentials/categories'
import { requireSession } from '../../../../modules/identity/session/require-session'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event) as { user: { id: string } }
  return await getCredentialCategoryManagement(getDatabase().db, {
    actorUserId: session.user.id,
    projectId: getRouterParam(event, 'id') ?? '',
  })
})
