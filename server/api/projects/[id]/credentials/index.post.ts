import { defineEventHandler, getRouterParam, readBody, setResponseStatus } from 'h3'
import { AUDIT_CHANNEL } from '../../../../../shared/projects/constants'
import { getDatabase } from '../../../../infrastructure/database/client'
import { createCredential, CREDENTIAL_ERROR } from '../../../../modules/credentials/credentials'
import { createCredentialBodySchema } from '../../../../modules/credentials/http-schemas'
import { getCredentialCrypto } from '../../../../modules/credentials/runtime'
import { requireSession } from '../../../../modules/identity/session/require-session'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event) as { user: { id: string } }
  const body = createCredentialBodySchema.safeParse(await readBody(event))
  if (!body.success) {
    setResponseStatus(event, 400)
    return { data: { code: CREDENTIAL_ERROR.INVALID_INPUT } }
  }
  const result = await createCredential(getDatabase().db, getCredentialCrypto(), {
    ...body.data,
    actorUserId: session.user.id,
    projectId: getRouterParam(event, 'id') ?? '',
    channel: AUDIT_CHANNEL.WEB,
  })
  if (result.ok) return result.value
  setResponseStatus(event, result.code === CREDENTIAL_ERROR.NOT_FOUND ? 404 : result.code === CREDENTIAL_ERROR.INVALID_INPUT ? 400 : 503)
  return { data: { code: result.code } }
})
