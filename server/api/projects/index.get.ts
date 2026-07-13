import { defineEventHandler } from 'h3'
import { requireSession } from '../../modules/identity/session/require-session'
import { listCurrentUserProjects } from '../../modules/projects/list-projects'

interface ProjectSession {
  readonly user: { readonly id: string }
}

export default defineEventHandler(async (event) => {
  const session = await requireSession(event) as ProjectSession
  return listCurrentUserProjects(session.user.id)
})
