# ADR 0027: Resolve current audit targets through safe projections

Date: 2026-08-22  
Status: accepted  
Accepted: 2026-08-22

## Context

Super administrators need to inspect the object referenced by an audit event.
Audit records intentionally do not contain object snapshots, document content,
credential values, OAuth tokens, provider payloads, or other sensitive source
data. Current objects may also have changed, been archived, or disappeared
after the recorded event.

A browser-supplied object type and ID would turn the preview endpoint into a
generic object-enumeration API. Reusing ordinary project endpoints would also
produce inconsistent results because a super administrator is not necessarily
a project member.

## Decision

- Audit target preview always represents current state, never historical state,
  and the UI states this distinction explicitly.
- The browser supplies only an audit event UUID. The server rechecks the active
  super-administrator account, loads the immutable target type, target ID, and
  project scope from that event, and resolves the object itself.
- Responses use a strict bounded projection containing a state, type, title,
  and at most twelve short label/value fields. Unknown response keys fail
  client decoding.
- The initial closed resolver supports projects, documents, users, credentials,
  and credential categories. Missing objects return a neutral unavailable
  state; technical and unknown target types return unsupported.
- Document content, project and category descriptions, credential login and
  password values, custom credential fields, encrypted envelopes, OAuth/MCP/AI
  internals, raw metadata, storage paths, and provider data never enter the
  response.
- Project-owned lookups require both the event's target ID and its project ID.
- Every successful preview read writes a content-free
  `administration.audit_target_viewed` event referring to the audit event, with
  only the closed result state in metadata.

## Consequences

- Administrators can inspect useful current identity and lifecycle information
  without making audit storage a second source of business data.
- The dialog cannot reconstruct state at the event timestamp and says so.
- Supporting another target type requires an explicit safe server projection
  and tests; it is never enabled by generic table introspection.
- Full document rendering and credential-value revelation remain outside the
  audit boundary.

## Alternatives rejected

- **Store complete snapshots in audit metadata:** duplicates sensitive content,
  expands retention risk, and violates the existing content-free audit policy.
- **Accept arbitrary target type and ID:** creates a broad administration
  enumeration endpoint detached from a real audit event.
- **Reuse ordinary feature detail endpoints:** their membership and permission
  contexts differ from the global super-administrator audit boundary.

