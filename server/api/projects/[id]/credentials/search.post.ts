import { defineEventHandler, getRouterParam, readBody, setHeader, setResponseStatus } from 'h3'
import { getDatabase } from '../../../../infrastructure/database/client'
import { searchAccessibleCredentials, CREDENTIAL_ERROR } from '../../../../modules/credentials/credentials'
import { searchCredentialBodySchema } from '../../../../modules/credentials/http-schemas'
import { getCredentialCrypto } from '../../../../modules/credentials/runtime'
import { requireSession } from '../../../../modules/identity/session/require-session'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event) as { user: { id: string } }
  setHeader(event, 'Cache-Control', 'no-store')
  const body = searchCredentialBodySchema.safeParse(await readBody(event))
  if (!body.success) {
    setResponseStatus(event, 400)
    return { data: { code: CREDENTIAL_ERROR.INVALID_INPUT } }
  }

  return await searchAccessibleCredentials(getDatabase().db, getCredentialCrypto(), {
    actorUserId: session.user.id,
    projectId: getRouterParam(event, 'id') ?? '',
    categoryId: null,
    query: body.data.query,
  })
})
