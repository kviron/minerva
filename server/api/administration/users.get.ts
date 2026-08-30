import { defineEventHandler, setHeader } from 'h3'
import { requireSuperAdmin } from '../../modules/authorization/require-super-admin'
import { listAllUsers } from '../../modules/administration/list-users'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  await requireSuperAdmin(event)
  return listAllUsers()
})
