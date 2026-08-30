# ADR 0016: Link OAuth consents and token families through a Minerva grant

Date: 2026-07-14  
Status: accepted

## Context

ADR 0005 requires one transaction to revoke a user's consent and every access and refresh token derived from it. The approved Slice 6.1 plan requires a Minerva-owned linkage if the pinned Better Auth OAuth Provider cannot express that operation atomically.

The audited `@better-auth/oauth-provider@1.6.22` schema has separate `oauthConsent`, `oauthRefreshToken`, and `oauthAccessToken` models. Access tokens may reference a refresh token, but neither token model references a consent. The provider's `deleteOAuthConsent` endpoint verifies ownership and deletes only the consent row. Its token-revocation endpoint operates on one submitted token and is not a user grant-management transaction.

## Decision

- Add a Minerva-owned OAuth grant identified by UUID and scoped to one user, OAuth client, and canonical resource.
- Persist that grant ID in the provider models' supported `referenceId` field for consent, refresh-token, and access-token records created for the grant.
- Treat an active Minerva grant as mandatory authorization state. Token introspection or cryptographic verification alone is insufficient for MCP dispatch.
- Revoke a grant in one PostgreSQL transaction by locking the grant, marking it revoked, invalidating or deleting every refresh and access token with its `referenceId`, deleting the associated consent, and appending a content-free audit event.
- Make revocation idempotent. A request that begins after the revocation transaction commits must receive `401 Unauthorized` before MCP dispatch.
- Do not expose the provider's consent-deletion endpoint directly as Minerva's grant-revocation action.

## Consequences

- Better Auth remains the OAuth protocol implementation, while Minerva owns the stronger product-level grant lifecycle required by ADR 0005.
- The OAuth migration needs an additive grant table and indexes on the provider `referenceId` columns.
- Token issuance and refresh contract tests must prove that `referenceId` remains stable across the token family.
- Grant-list responses expose safe client, scope, resource, and timestamp projections only; they never expose token material.
