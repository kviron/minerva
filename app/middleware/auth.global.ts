import { getIdentitySession } from '@/features/identity'

const publicPrefixes = ['/auth', '/legal', '/invitations']

export default defineNuxtRouteMiddleware(async (to) => {
  const isPublic = publicPrefixes.some(prefix =>
    to.path === prefix || to.path.startsWith(`${prefix}/`),
  )
  const { data: session } = await getIdentitySession()

  if (!session && !isPublic) return navigateTo('/auth')
  if (session && to.path === '/auth') return navigateTo('/')
})
