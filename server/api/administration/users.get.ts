import { defineEventHandler } from 'h3'
import { requireSuperAdmin } from '../../modules/authorization/require-super-admin'
import { listAllUsers } from '../../modules/administration/list-users'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  return listAllUsers()
})
