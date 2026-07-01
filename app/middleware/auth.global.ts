import { decideRouteAccess, getIdentitySession } from '@/features/identity'

export default defineNuxtRouteMiddleware(async (to) => {
  const { data: session, error } = await getIdentitySession()
  const decision = decideRouteAccess({
    path: to.path,
    session,
    sessionError: Boolean(error),
  })

  if (decision.type === 'redirect')
    return navigateTo(decision.to)

  if (decision.type === 'error')
    return abortNavigation(createError({ statusCode: 503, statusMessage: 'Service Unavailable' }))
})
