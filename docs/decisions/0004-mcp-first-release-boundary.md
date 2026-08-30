# ADR 0004: Limit the first MCP release to documentation workflows

Date: 2026-06-24  
Status: accepted

## Decision

The first MCP release exposes project discovery and document read/write/publish operations. User administration, memberships, role-matrix mutation, global settings, and super-admin operations remain web-only.

## Rationale

Documentation automation is the product's differentiator. Administrative mutation adds a much larger privilege-escalation and recovery surface without being required to validate the core AI workflow.

## Consequences

- OAuth scopes initially cover project reads and document operations.
- Administrative MCP scopes remain reserved and unimplemented.
- Expansion requires security review, threat modelling, audit evidence, and a new ADR.

## Project lifecycle amendment

Accepted ADR 0028 keeps project lifecycle administration web/API-only. Pause,
resume, close, reopen, archive, and restore are not registered as MCP tools.
Every permitted MCP project operation additionally requires the selected
project to be active.
