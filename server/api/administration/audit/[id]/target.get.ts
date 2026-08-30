import { createError, defineEventHandler, getValidatedRouterParams, setHeader } from 'h3'
import { administrationAuditTargetRouteParamsSchema } from '../../../../../shared/administration/contracts'
import { getAuditTarget } from '../../../../modules/administration/get-audit-target'
import { requireSuperAdmin } from '../../../../modules/authorization/require-super-admin'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const session = await requireSuperAdmin(event)
  let params
  try {
    params = await getValidatedRouterParams(event, value => administrationAuditTargetRouteParamsSchema.parse(value))
  }
  catch {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
  const target = await getAuditTarget(session.user.id, params.id)
  if (target === null) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  return target
})
