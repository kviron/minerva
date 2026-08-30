import { createError, defineEventHandler, getValidatedQuery, setHeader } from 'h3'
import { administrationAuditQuerySchema } from '../../../shared/administration/contracts'
import { requireSuperAdmin } from '../../modules/authorization/require-super-admin'
import { listAuditEvents } from '../../modules/administration/list-audit-events'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const session = await requireSuperAdmin(event)

  let query
  try {
    query = await getValidatedQuery(event, value => administrationAuditQuerySchema.parse(value))
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request' })
  }

  return listAuditEvents(session.user.id, query)
})
