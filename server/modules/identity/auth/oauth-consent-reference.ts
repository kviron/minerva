type OAuthProviderState = Readonly<{ query?: string }> | null

type EnsureActiveGrant = (input: Readonly<{
  actorUserId: string
  clientId: string
  resource: string
  scopes: readonly string[]
}>) => Promise<string>

type ResolveOAuthConsentReferenceInput = Readonly<{
  state: OAuthProviderState
  userId: string
  scopes: readonly string[]
  canonicalResource: string
  ensureActive: EnsureActiveGrant
}>

export async function resolveOAuthConsentReference({
  state,
  userId,
  scopes,
  canonicalResource,
  ensureActive,
}: ResolveOAuthConsentReferenceInput): Promise<string> {
  const clientId = state?.query ? new URLSearchParams(state.query).get('client_id') : null
  if (!clientId) throw new Error('OAuth authorization context is unavailable')

  return ensureActive({
    actorUserId: userId,
    clientId,
    resource: canonicalResource,
    scopes,
  })
}
