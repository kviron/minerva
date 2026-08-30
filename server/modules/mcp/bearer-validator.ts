import { createHash } from 'node:crypto'
import { ACCOUNT_STATUS, OAUTH_GRANT_STATUS } from '../../../shared/identity/constants'

export const MCP_BEARER_RESULT = {
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
} as const

export type McpActor = Readonly<{
  userId: string
  clientId: string
  grantId: string
  issuer: string
  resource: string
  scopes: readonly string[]
  locale: 'ru' | 'en'
  requestId: string
}>

export type McpTokenRecord = Readonly<{
  userId: string
  accountStatus: string
  clientId: string
  grantId: string
  grantStatus: string
  grantResource: string
  tokenScopes: readonly string[]
  grantScopes: readonly string[]
  expiresAt: Date
}>

type McpBearerValidatorDependencies = Readonly<{
  findByTokenHash: (tokenHash: string) => Promise<McpTokenRecord | null>
  now: () => Date
  createRequestId: () => string
  issuer: string
  resource: string
}>

export type McpBearerResult =
  | Readonly<{ type: typeof MCP_BEARER_RESULT.AUTHENTICATED, actor: McpActor }>
  | Readonly<{ type: typeof MCP_BEARER_RESULT.UNAUTHENTICATED, requestId: string }>

const hashOpaqueToken = (token: string): string => createHash('sha256').update(token).digest('base64url')

export function createMcpBearerValidator(dependencies: McpBearerValidatorDependencies) {
  return async function validateMcpBearer(token: string | undefined, locale: 'ru' | 'en'): Promise<McpBearerResult> {
    const requestId = dependencies.createRequestId()
    if (!token) return { type: MCP_BEARER_RESULT.UNAUTHENTICATED, requestId }

    const record = await dependencies.findByTokenHash(hashOpaqueToken(token))
    const grantScopes = new Set(record?.grantScopes ?? [])
    const valid = record !== null
      && record.expiresAt.getTime() > dependencies.now().getTime()
      && record.accountStatus === ACCOUNT_STATUS.ACTIVE
      && record.grantStatus === OAUTH_GRANT_STATUS.ACTIVE
      && record.grantResource === dependencies.resource
      && record.tokenScopes.every(scope => grantScopes.has(scope))

    if (!valid || !record) return { type: MCP_BEARER_RESULT.UNAUTHENTICATED, requestId }

    return {
      type: MCP_BEARER_RESULT.AUTHENTICATED,
      actor: {
        userId: record.userId,
        clientId: record.clientId,
        grantId: record.grantId,
        issuer: dependencies.issuer,
        resource: record.grantResource,
        scopes: record.tokenScopes,
        locale,
        requestId,
      },
    }
  }
}
