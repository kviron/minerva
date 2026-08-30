const REQUEST_EVENT = {
  COMPLETED: 'http.request.completed',
  FAILED: 'http.request.failed',
} as const

const REQUEST_LEVEL = {
  INFO: 'info',
  ERROR: 'error',
} as const

type RequestLogInput = Readonly<{
  requestId: string
  method: string
  route: string
  statusCode: number
  durationMs: number
  occurredAt: string
}> & (
  | Readonly<{ type: 'completed' }>
  | Readonly<{ type: 'failed' }>
)

export type RequestLogRecord = Readonly<{
  timestamp: string
  level: typeof REQUEST_LEVEL[keyof typeof REQUEST_LEVEL]
  event: typeof REQUEST_EVENT[keyof typeof REQUEST_EVENT]
  requestId: string
  method: string
  route: string
  statusCode: number
  durationMs: number
}>

const canonicalRequestId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
const publicCapability = /^[A-Za-z0-9_-]{43}$/u

export const createRequestIdentity = (inbound: string | undefined, createId: () => string): string =>
  inbound && canonicalRequestId.test(inbound) ? inbound.toLowerCase() : createId()

export const requestTelemetryRoute = (pathname: string): string => {
  const segments = pathname.split('/').filter(Boolean)
  const publicApi = segments[0] === 'api' && segments[1] === 'public' && segments[2] === 'documentation'
  const publicPage = segments[0] === 'share' && segments[1] === 'documentation'

  const safeSegments = segments.map((segment, index) => {
    if ((publicApi && index === 3 || publicPage && index === 2) && publicCapability.test(segment)) return '[capability]'
    if (uuid.test(segment)) return '[id]'
    if (/^\d+$/u.test(segment)) return '[number]'
    return /^[A-Za-z][A-Za-z0-9._-]{0,63}$/u.test(segment) ? segment : '[segment]'
  })

  return `/${safeSegments.join('/')}`
}

export const createRequestLogRecord = (input: RequestLogInput): RequestLogRecord => ({
  timestamp: input.occurredAt,
  level: input.type === 'failed' ? REQUEST_LEVEL.ERROR : REQUEST_LEVEL.INFO,
  event: input.type === 'failed' ? REQUEST_EVENT.FAILED : REQUEST_EVENT.COMPLETED,
  requestId: input.requestId,
  method: input.method.toUpperCase().slice(0, 16),
  route: input.route.slice(0, 256),
  statusCode: Number.isSafeInteger(input.statusCode) ? input.statusCode : 500,
  durationMs: Math.max(0, Math.round(input.durationMs)),
})
