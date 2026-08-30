# ADR 0017: Serialize OAuth token issuance with grant revocation

Date: 2026-07-14  
Status: accepted

## Context

ADR 0005 and ADR 0016 require immediate grant revocation. Deleting the token rows inside the revocation transaction is insufficient by itself: a concurrent Better Auth refresh transaction could read an active refresh token before revocation, wait, and insert its replacement after the revocation transaction commits.

The OAuth Provider owns token persistence, so the Minerva grant service cannot reliably wrap every internal token write in an application-level lock without replacing or patching the provider.

## Decision

- Guard every access-token and refresh-token insert or grant-reference update in PostgreSQL.
- When a token carries a `reference_id`, require it to be a UUID referencing an active Minerva OAuth grant.
- Acquire `FOR KEY SHARE` on that grant row before the token write.
- Keep revocation's existing `FOR UPDATE` grant lock. The conflicting row locks serialize issuance and revocation in either order.
- Allow null references at the generic provider schema boundary, while requiring a valid active reference for every Minerva MCP token through provider configuration and tests.

## Consequences

- If token issuance locks first, revocation waits and subsequently deletes the committed token family.
- If revocation locks first, later token issuance waits and is rejected after observing the revoked grant.
- A request beginning after revocation commits cannot persist a token for that grant.
- The invariant remains effective for provider-internal writes and future application processes that use the same tables.
