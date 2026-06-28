import { createError, defineEventHandler, getRequestURL, toWebRequest } from 'h3'
import { getAuth } from '../../modules/identity/auth'

const minervaOwnedPaths = new Set([
  '/api/auth/sign-up/email',
  '/api/auth/is-username-available',
  '/api/auth/sign-in/email',
  '/api/auth/sign-in/username',
  '/api/auth/request-password-reset',
  '/api/auth/reset-password',
])

export default defineEventHandler(async (event) => {
  if (minervaOwnedPaths.has(getRequestURL(event).pathname)) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  return getAuth().handler(toWebRequest(event))
})
