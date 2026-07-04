# ADR 0009: Anonymize deleted user accounts while preserving identity references

Date: 2026-07-05  
Status: proposed

## Context

Projects, memberships, documents, versions, and audit records must retain trustworthy historical authorship. Physically deleting a user would either destroy those relationships or require unsafe cascading deletion. Retaining personal information after a legitimate account-deletion request is also undesirable.

## Decision

Treat user-requested account deletion as irreversible anonymization of the existing identity row rather than physical deletion.

- Preserve the user's UUID so memberships, authorship, and audit relationships remain valid.
- Mark the identity with a dedicated deleted status and deletion timestamp.
- Revoke sessions and remove authentication credentials, recovery material, profile data, contacts, avatar association, and other personal fields.
- Replace required unique identity fields with deterministic non-personal tombstone values that cannot be used to sign in and are never exposed to ordinary clients.
- Project and document projections render the localized label `Аккаунт удалён` / `Deleted account` from account status rather than relying on stored name or username text.
- Never expose the tombstone email, database identifiers beyond authorized stable IDs, credential records, or deletion metadata through MCP.
- Keep project memberships and historical records; authorization treats a deleted account as inactive and grants it no access.

The exact deletion command, retention obligations, audit metadata, and recovery policy require their own Identity implementation design before this proposed ADR is accepted and implemented.

## Consequences

Historical records retain stable referential integrity without retaining the former display identity. User foreign keys in new domain tables must not use cascading deletion. Queries and UI projections must explicitly handle deleted identities. The identity schema will need a future migration and deletion service; the Projects foundation only preserves compatibility with this decision.

