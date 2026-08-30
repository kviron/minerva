# MCP and OAuth operations

## Local setup

1. Start PostgreSQL and apply all Drizzle migrations.
2. Set `BETTER_AUTH_URL=http://127.0.0.1:3000` and `MCP_RESOURCE_URL=http://127.0.0.1:3000/mcp`.
3. Generate independent random values of at least 32 characters for `BETTER_AUTH_SECRET` and `RATE_LIMIT_HMAC_SECRET`; never commit them.
4. Keep `TRUST_PROXY=false` for a directly exposed local process and list browser origins explicitly in `TRUSTED_ORIGINS`.
5. Register each public MCP client with exact redirect URIs, authorization-code and refresh-token grants, PKCE required, and no client secret.

The authorization server metadata is published at `/.well-known/oauth-authorization-server/api/auth`; protected-resource metadata is published at `/.well-known/oauth-protected-resource/mcp`.

## Production issuer and resource

- Use HTTPS for both `BETTER_AUTH_URL` and the canonical `MCP_RESOURCE_URL`; the resource must have the exact `/mcp` path and no query or fragment.
- Treat both values as stable security identifiers. Changing either requires clients to rediscover and reconnect.
- Register only exact redirect URIs. Do not use wildcard redirects or enable dynamic client registration.
- `offline_access` permits refresh-token issuance but maps to no MCP capability. Project and document scopes still combine with current server-side project RBAC on every request.

## Reverse proxy trust

Leave `TRUST_PROXY=false` unless every request reaches Minerva through a controlled proxy that removes inbound forwarding headers and writes the authoritative client address. Set it to `true` only in that topology. MCP uses the resulting address together with a token-derived HMAC key for rate limiting. A misconfigured trusted proxy lets clients spoof addresses; an untrusted proxy setting collapses clients onto the proxy address.

The proxy must preserve the public HTTPS host and scheme expected by `BETTER_AUTH_URL`, pass request bodies without rewriting JSON, and enforce a body limit no larger than Minerva's 1 MiB MCP limit.

## Secrets and rotation

- Rotate `BETTER_AUTH_SECRET` during a maintenance window. Existing signed browser state and in-flight authorization requests can become invalid, so require users and MCP clients to restart authorization afterward.
- Rotate `RATE_LIMIT_HMAC_SECRET` independently. Rotation changes rate-limit bucket identifiers and effectively starts fresh buckets; do not reuse either secret for another purpose.
- Store secrets in the deployment secret manager, restrict read access, and restart every application instance together so authorization behavior is consistent.
- OAuth access and refresh tokens are opaque and stored only as hashes. Never log request `Authorization` headers, token endpoint bodies, authorization codes, or raw cookies.

## Limits and monitoring

- MCP requests are limited to 120 requests per 60 seconds per HMAC-derived IP/token bucket and to a 1 MiB actual body size.
- OAuth endpoint limits are database-backed: authorize 30/minute, token 20/minute, revoke 30/minute, introspection 100/minute, and userinfo 60/minute.
- Monitor repeated `mcp.authentication_rejected` audit events and HTTP 429 responses. Rejected-authentication audit metadata contains only the generated request ID; it intentionally contains no token fingerprint, client, grant, user, IP, or document content.

## Incident revocation

1. Identify the connection in the user's Connections settings by client, resource, scopes, and timestamps; do not request token material.
2. Revoke the grant through the normal grant-management action. The transaction marks the grant revoked, deletes its consent and complete access/refresh token family, and records `oauth.grant_revoked`.
3. Confirm subsequent MCP access returns the generic RFC 9728 `401 Unauthorized` challenge and creates a content-free `mcp.authentication_rejected` audit event.
4. If compromise may affect multiple grants, revoke each affected grant. Disable the user account only when all account access must stop.
5. Preserve audit records and deployment logs according to the incident policy, but never add raw tokens or private document content to the investigation record.
