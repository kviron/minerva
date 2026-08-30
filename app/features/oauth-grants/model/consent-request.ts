import { z } from 'zod'
import { MCP_SCOPES } from '../../../../shared/mcp/constants'

const queryValue = z.union([z.string(), z.array(z.string())]).transform(value =>
  Array.isArray(value) ? value[0] : value,
)

const consentQuerySchema = z.object({
  client_id: queryValue.pipe(z.string().min(1)),
  scope: queryValue.pipe(z.string().min(1)),
  sig: queryValue.pipe(z.string().min(1)),
}).passthrough()

const allowedScopes = new Set<string>(MCP_SCOPES)

export type OAuthConsentRequest = Readonly<{ clientId: string, scopes: readonly string[] }>

export function parseOAuthConsentRequest(query: Record<string, unknown>): OAuthConsentRequest {
  const parsed = consentQuerySchema.parse(query)
  const scopes = parsed.scope.split(' ').filter(Boolean)
  if (scopes.length === 0 || scopes.some(scope => !allowedScopes.has(scope))) {
    throw new Error('Invalid OAuth consent scopes')
  }
  return { clientId: parsed.client_id, scopes }
}
