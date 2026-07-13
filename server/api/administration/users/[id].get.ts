import { createError, defineEventHandler, getRouterParam } from 'h3'
import { requireSuperAdmin } from '../../../modules/authorization/require-super-admin'
import { getAdministrationUserById } from '../../../modules/administration/list-users'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const userId = getRouterParam(event, 'id')

  if (!userId) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const user = await getAdministrationUserById(userId)
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  return user
})
