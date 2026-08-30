import { defineEventHandler, getRouterParam, readBody, setResponseStatus } from 'h3'
import { AUDIT_CHANNEL } from '../../../../../shared/projects/constants'
import { getDatabase } from '../../../../infrastructure/database/client'
import { CREDENTIAL_ERROR, updateCredential } from '../../../../modules/credentials/credentials'
import { updateCredentialBodySchema } from '../../../../../shared/credentials/contracts'
import { getCredentialCrypto } from '../../../../modules/credentials/runtime'
import { requireSession } from '../../../../modules/identity/session/require-session'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event) as { user: { id: string } }
  const body = updateCredentialBodySchema.safeParse(await readBody(event))
  if (!body.success) {
    setResponseStatus(event, 400)
    return { data: { code: CREDENTIAL_ERROR.INVALID_INPUT } }
  }
  const result = await updateCredential(getDatabase().db, getCredentialCrypto(), {
    ...body.data,
    actorUserId: session.user.id,
    projectId: getRouterParam(event, 'id') ?? '',
    credentialId: getRouterParam(event, 'credentialId') ?? '',
    channel: AUDIT_CHANNEL.WEB,
  })
  if (result.ok) return { ok: true }
  setResponseStatus(event, result.code === CREDENTIAL_ERROR.NOT_FOUND ? 404 : result.code === CREDENTIAL_ERROR.INVALID_INPUT ? 400 : 503)
  return { data: { code: result.code } }
})
