import { defineEventHandler, getRouterParam, readBody, setResponseStatus } from 'h3'
import { AUDIT_CHANNEL } from '../../../../../shared/projects/constants'
import { getDatabase } from '../../../../infrastructure/database/client'
import { CREDENTIAL_CATEGORY_ERROR, updateCredentialCategory } from '../../../../modules/credentials/categories'
import { credentialCategoryBodySchema } from '../../../../../shared/credentials/category-contracts'
import { requireSession } from '../../../../modules/identity/session/require-session'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event) as { user: { id: string } }
  const body = credentialCategoryBodySchema.safeParse(await readBody(event))
  if (!body.success) {
    setResponseStatus(event, 400)
    return { data: { code: CREDENTIAL_CATEGORY_ERROR.INVALID_CATEGORY_NAME } }
  }
  const result = await updateCredentialCategory(getDatabase().db, {
    ...body.data,
    actorUserId: session.user.id,
    projectId: getRouterParam(event, 'id') ?? '',
    categoryId: getRouterParam(event, 'categoryId') ?? '',
    channel: AUDIT_CHANNEL.WEB,
  })
  if (result.ok) return { ok: true }
  setResponseStatus(event, result.code === CREDENTIAL_CATEGORY_ERROR.CATEGORY_NOT_FOUND ? 404 : result.code.startsWith('INVALID_') ? 400 : 503)
  return { data: { code: result.code } }
})
