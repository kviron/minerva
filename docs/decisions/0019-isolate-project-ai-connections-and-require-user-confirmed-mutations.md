# ADR 0019: Isolate project AI connections and require user-confirmed mutations

Date: 2026-07-16
Status: Accepted

## Context

The project-wide AI assistant needs a provider credential, current project documentation, and eventually a way to help edit documents. Reusing ordinary project Credentials would make provider secrets reachable through the credential-vault feature and its grants. Executing as a service account would allow an assistant turn to outlive or bypass the requesting member's current access. Giving a model direct document mutation tools would make untrusted document instructions and provider output capable of changing durable content without a human-controlled review boundary.

## Decision

- Store provider connections in a dedicated AI Assistant module and table. Reuse the versioned authenticated-encryption primitive with AI-specific associated data, but never route provider keys through the Credentials module.
- Execute every assistant request as the signed-in user. Re-evaluate active account, active project, active membership, and the exact stable permission code at the server boundary and again when an authorized document application service runs.
- Use `project.ai.use` to submit assistant turns and `project.ai.manage` to administer provider connections and safe limits. Built-in Admin receives both permissions; Editor and Viewer receive use only. Custom roles receive neither automatically.
- Keep the initial assistant tools read-only and backed by existing authorization-aware document application services. Project identity comes from trusted server context rather than model input.
- Treat later model-authored changes as proposals only. Minerva validates and displays an exact diff, requires explicit user confirmation, rechecks the existing document mutation permission and optimistic revision, then invokes the established idempotent application service.
- Keep publishing, archival, restoration, and destructive operations outside the first proposal increment and behind separate future approval and confirmation boundaries.

## Consequences

- Provider keys have a smaller, independently auditable exposure surface and never appear in credential lists, browser projections, MCP, logs, audit metadata, or generated indexes.
- Removing membership, changing a custom role, disabling an account, archiving a project, or disconnecting a provider affects the next assistant request.
- The model cannot independently mutate Minerva. A successful change remains attributable to the currently authorized user and a deliberate confirmation.
- Connection storage, streaming orchestration, proposal persistence, and retention require separate implementation slices and security tests.

## Project lifecycle amendment

Accepted ADR 0028 preserves the active-project requirement: paused, closed,
and archived projects deny AI connection use, history operations, turns,
tools, and proposals. Archive disables the connection without deleting its
encrypted key; restore does not automatically re-enable it.
