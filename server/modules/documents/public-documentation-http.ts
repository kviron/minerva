import { getRequestIP, setHeader, setResponseStatus, type H3Event } from 'h3'
import { getServerEnv } from '../../config/runtime-env'
import { consumePublicDocumentationFailureRateLimit } from './public-documentation-rate-limit'

export const setPublicDocumentationHeaders = (event: H3Event): void => {
  event.context.publicDocumentationTelemetryPath = '/api/public/documentation/[capability]'
  setHeader(event, 'Cache-Control', 'no-store')
  setHeader(event, 'Referrer-Policy', 'no-referrer')
  setHeader(event, 'X-Robots-Tag', 'noindex, nofollow, noarchive')
}

export const redactPublicDocumentationPath = (value: string): string =>
  value.replace(
    /\/api\/public\/documentation\/[^/?#\s]+/gu,
    '/api/public/documentation/[capability]',
  )

interface PublicDocumentationFailureResponse {
  readonly statusCode: 404 | 429
  readonly message: 'Documentation unavailable' | 'Too Many Requests'
}

export const publicDocumentationUnavailable = async (
  event: H3Event,
): Promise<PublicDocumentationFailureResponse> => {
  const env = getServerEnv()
  const ip = getRequestIP(event, { xForwardedFor: env.TRUST_PROXY }) ?? 'unknown'
  const allowed = await consumePublicDocumentationFailureRateLimit({ ip })
  if (!allowed) {
    setResponseStatus(event, 429, 'Too Many Requests')
    return { statusCode: 429, message: 'Too Many Requests' }
  }
  setResponseStatus(event, 404, 'Documentation unavailable')
  return { statusCode: 404, message: 'Documentation unavailable' }
}
