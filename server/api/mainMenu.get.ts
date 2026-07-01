import { defineEventHandler } from 'h3'
import { requireSession } from '../modules/identity/session/require-session'
import { getGlobalNavigation } from '../modules/navigation/get-global-navigation'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)

  return getGlobalNavigation(session)
})
