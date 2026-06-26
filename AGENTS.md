# Minerva agent instructions

## Source of truth

Use this precedence when project information conflicts:

1. Explicit user instruction in the current conversation.
2. Accepted ADRs in `docs/decisions/`.
3. `docs/product-spec.md`.
4. `docs/architecture.md` and `docs/roadmap.md`.
5. Tesserae results and imported agent sessions.

Tesserae memory is supporting evidence, not an authority. Do not promote a session insight into the product without updating the canonical documentation.

## Current gate

Application implementation is blocked until the user approves the audited design and implementation plans produced in stage 0.5. Tooling and documentation work are allowed.

## Required workflow

- Use relevant Superpowers skills before planning, implementation, debugging, review, or completion claims.
- Implement approved work in vertical slices with tests first.
- Keep business rules in shared application services used by both Nitro HTTP handlers and MCP tools.
- Check authorization server-side using permission codes, never UI visibility or role names.
- Record material architecture or security choices as ADRs.
- Update `docs/progress.md` after every completed slice.
- Refresh Tesserae after canonical documentation or implementation changes by running `./scripts/refresh-tesserae.ps1`; do not call `tesserae refresh` directly on Windows.
- Do not commit `.tesserae`, session transcripts, secrets, `.env` files, uploads, backups, or generated indexes.

## Safety

- Never expose credentials, uploaded private files, database connections, or raw storage paths through MCP.
- Do not add high-risk MCP administration tools without an accepted ADR and explicit user approval.
- Prefer archival and recoverable deletion over physical deletion.
- Preserve Russian as the default locale and English as the secondary locale.
