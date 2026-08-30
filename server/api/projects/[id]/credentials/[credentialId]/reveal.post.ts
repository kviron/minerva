import { defineEventHandler, getRequestIP, getRouterParam, readBody, setHeader, setResponseStatus } from 'h3'
import { AUDIT_CHANNEL } from '../../../../../../shared/projects/constants'
import { getDatabase } from '../../../../../infrastructure/database/client'
import { CREDENTIAL_ERROR, revealCredentialSecret } from '../../../../../modules/credentials/credentials'
import { revealCredentialBodySchema } from '../../../../../../shared/credentials/contracts'
import { getCredentialCrypto } from '../../../../../modules/credentials/runtime'
import { consumeIdentityRateLimit } from '../../../../../modules/identity/rate-limit'
import { requireSession } from '../../../../../modules/identity/session/require-session'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event) as { user: { id: string } }
  setHeader(event, 'Cache-Control', 'no-store')
  const body = revealCredentialBodySchema.safeParse(await readBody(event))
  if (!body.success) {
    setResponseStatus(event, 400)
    return { data: { code: CREDENTIAL_ERROR.INVALID_INPUT } }
  }
  await consumeIdentityRateLimit({
    scope: 'credential-reveal',
    ip: getRequestIP(event, { xForwardedFor: false }) ?? 'unknown',
    identity: session.user.id,
    max: 30,
    windowSeconds: 60,
  })
  const result = await revealCredentialSecret(getDatabase().db, getCredentialCrypto(), {
    actorUserId: session.user.id,
    projectId: getRouterParam(event, 'id') ?? '',
    credentialId: getRouterParam(event, 'credentialId') ?? '',
    target: body.data.target,
    channel: AUDIT_CHANNEL.WEB,
  })
  if (result.ok) return { value: result.value }
  setResponseStatus(event, result.code === CREDENTIAL_ERROR.NOT_FOUND ? 404 : 503)
  return { data: { code: result.code } }
})
