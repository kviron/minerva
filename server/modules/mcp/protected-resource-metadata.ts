import { MCP_SCOPES } from '../../../shared/mcp/constants'

type ProtectedResourceMetadataInput = Readonly<{
  issuer: string
  resource: string
}>

export const buildAuthorizationServerIssuer = (baseURL: string) => new URL('/api/auth', baseURL).toString()

export const buildProtectedResourceMetadata = ({ issuer, resource }: ProtectedResourceMetadataInput) => ({
  resource,
  authorization_servers: [issuer],
  scopes_supported: MCP_SCOPES,
  bearer_methods_supported: ['header'] as const,
  resource_name: 'Minerva MCP',
})
