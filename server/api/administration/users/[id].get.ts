import { createError, defineEventHandler, getValidatedRouterParams, setHeader } from 'h3'
import { administrationUserRouteParamsSchema } from '../../../../shared/administration/contracts'
import { requireSuperAdmin } from '../../../modules/authorization/require-super-admin'
import { getAdministrationUserById } from '../../../modules/administration/list-users'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  await requireSuperAdmin(event)
  let params
  try {
    params = await getValidatedRouterParams(event, value => administrationUserRouteParamsSchema.parse(value))
  }
  catch {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const user = await getAdministrationUserById(params.id)
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  return user
})
