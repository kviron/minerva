import {
  MCP_BEARER_RESULT,
  type McpActor,
  type McpBearerResult,
} from './bearer-validator'
import { guardMcpRequest, MCP_REQUEST_RESULT } from './request-guard'

type McpHttpHandlerDependencies = Readonly<{
  allowedOrigins: readonly string[]
  maxBodyBytes: number
  resourceMetadataUrl: string
  consumeRateLimit: (ip: string, token: string | undefined) => Promise<boolean>
  validateBearer: (token: string | undefined, locale: 'ru' | 'en') => Promise<McpBearerResult>
  recordRejectedAuthentication: (input: Readonly<{ requestId: string }>) => Promise<void>
  dispatch: (request: Request, actor: McpActor) => Promise<Response>
}>

const jsonRpcError = (status: number, code: number, message: string, headers?: HeadersInit) => new Response(
  JSON.stringify({ jsonrpc: '2.0', error: { code, message }, id: null }),
  { status, headers: { 'content-type': 'application/json', ...headers } },
)

const bearerToken = (authorization: string | null): string | undefined => {
  const match = /^Bearer ([A-Za-z0-9._~+/-]+=*)$/u.exec(authorization ?? '')
  return match?.[1]
}

const requestLocale = (acceptLanguage: string | null): 'ru' | 'en' =>
  acceptLanguage?.toLowerCase().startsWith('en') ? 'en' : 'ru'

const readBoundedRequest = async (request: Request, maxBodyBytes: number): Promise<Request | null> => {
  const reader = request.body?.getReader()
  if (reader === undefined) {
    return new Request(request.url, { method: request.method, headers: request.headers })
  }

  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const chunk = await reader.read()
    if (chunk.done) {
      break
    }

    size += chunk.value.byteLength
    if (size > maxBodyBytes) {
      await reader.cancel()
      return null
    }
    chunks.push(chunk.value)
  }

  const body = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }

  const headers = new Headers(request.headers)
  headers.set('content-length', String(size))
  return new Request(request.url, { method: request.method, headers, body })
}

export function createMcpHttpHandler(dependencies: McpHttpHandlerDependencies) {
  return async function handleMcpHttp(request: Request, ip: string): Promise<Response> {
    const guarded = guardMcpRequest({
      method: request.method,
      origin: request.headers.get('origin'),
      contentType: request.headers.get('content-type'),
      contentLength: request.headers.get('content-length'),
    }, dependencies)
    if (guarded.type === MCP_REQUEST_RESULT.REJECTED) {
      return jsonRpcError(400, -32600, 'Invalid Request')
    }

    const token = bearerToken(request.headers.get('authorization'))
    if (!await dependencies.consumeRateLimit(ip, token)) {
      return jsonRpcError(429, -32000, 'Request limit exceeded', { 'retry-after': '60' })
    }

    const boundedRequest = await readBoundedRequest(request, dependencies.maxBodyBytes)
    if (boundedRequest === null) {
      return jsonRpcError(400, -32600, 'Invalid Request')
    }

    const authentication = await dependencies.validateBearer(
      token,
      requestLocale(request.headers.get('accept-language')),
    )
    if (authentication.type === MCP_BEARER_RESULT.UNAUTHENTICATED) {
      await dependencies.recordRejectedAuthentication({ requestId: authentication.requestId }).catch(() => undefined)
      return jsonRpcError(401, -32001, 'Unauthorized', {
        'www-authenticate': `Bearer resource_metadata="${dependencies.resourceMetadataUrl}", error="invalid_token"`,
      })
    }

    return dependencies.dispatch(boundedRequest, authentication.actor)
  }
}
