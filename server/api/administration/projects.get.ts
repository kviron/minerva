import { defineEventHandler } from 'h3'
import { requireSuperAdmin } from '../../modules/authorization/require-super-admin'
import { listAllProjects } from '../../modules/projects/list-projects'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  return listAllProjects()
})
