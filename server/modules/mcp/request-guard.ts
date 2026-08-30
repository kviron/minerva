export const MCP_REQUEST_RESULT = {
  ALLOWED: 'allowed',
  REJECTED: 'rejected',
} as const

type McpRequestMetadata = Readonly<{
  method: string
  origin: string | null
  contentType: string | null
  contentLength: string | null
}>

type McpRequestPolicy = Readonly<{
  allowedOrigins: readonly string[]
  maxBodyBytes: number
}>

export function guardMcpRequest(request: McpRequestMetadata, policy: McpRequestPolicy) {
  const contentLength = request.contentLength === null ? Number.NaN : Number(request.contentLength)
  const allowed = request.method === 'POST'
    && (request.origin === null || policy.allowedOrigins.includes(request.origin))
    && request.contentType?.split(';', 1)[0]?.trim().toLowerCase() === 'application/json'
    && Number.isSafeInteger(contentLength)
    && contentLength >= 0
    && contentLength <= policy.maxBodyBytes

  return allowed
    ? { type: MCP_REQUEST_RESULT.ALLOWED } as const
    : { type: MCP_REQUEST_RESULT.REJECTED } as const
}
