import { createError, defineEventHandler, getRouterParam, readBody, setHeader } from 'h3'
import { searchDocumentsBodySchema } from '../../../../modules/documents/http-schemas'
import { searchCurrentUserDocuments } from '../../../../modules/documents/search-documents'
import { requireSession } from '../../../../modules/identity/session/require-session'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const projectId = getRouterParam(event, 'id')
  const body = searchDocumentsBodySchema.safeParse(await readBody(event))
  setHeader(event, 'Cache-Control', 'private, no-store')

  if (!projectId || !body.success) {
    throw createError({ statusCode: body.success ? 404 : 400, statusMessage: body.success ? 'Not Found' : 'Bad Request' })
  }

  const results = await searchCurrentUserDocuments(projectId, session.user.id, body.data.query)
  if (results === null) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
  return results
})
