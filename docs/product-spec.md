# Minerva product specification

Status: awaiting user approval after Superpowers audit  
Last updated: 2026-06-24

## Product goal

Minerva is a private workspace where a web-production team stores client projects and maintains reliable project documentation. Its distinguishing capability is controlled AI access through MCP: an authorized model can find, read, draft, update, and publish documentation without bypassing user permissions.

The first usable release must let a small internal team:

1. Sign in through an invitation-only system.
2. Create a project and assign project roles.
3. Build a tree of rich-text documentation.
4. Save drafts, publish immutable versions, and restore prior content.
5. Search documentation without leaking inaccessible projects.
6. Connect an MCP client and perform documentation operations under the user's permissions.

## Users and authorization

### Global administration

- `super_admin` is a global account attribute and bypasses project membership checks.
- The system must always retain at least one active `super_admin`.
- A bootstrap command creates the first `super_admin`; it must be idempotent and must not print a password.
- Public registration is disabled. Users join through expiring, single-use invitations.

### Project authorization

- Every project has isolated roles and memberships.
- A membership has exactly one project role.
- New projects receive `Admin`, `Editor`, and `Viewer` roles from system templates.
- Project Admins may create custom roles and edit the project permission matrix.
- The built-in Admin role retains a non-removable safety set: project administration, member administration, and role administration.
- The last active Project Admin cannot be removed, demoted, or disabled.
- Authorization is checked through stable permission codes, not localized role names.

Initial permission groups:

- Project: view, update, archive, restore.
- Documents: view, create, update draft, publish, move, archive, restore, view history.
- Members: view, invite, assign role, remove.
- Roles: view, create, update, delete.
- Audit: view project audit.

## Projects

A project contains a name, optional description, lifecycle status, timestamps, creator, memberships, roles, documents, and audit records. Deletion is a recoverable archive operation in the first release.

## Documentation

- Documents form a manually ordered adjacency-list tree within one project.
- A document has a title, slug, parent, order, owner, draft revision number, publication state, and soft-deletion metadata.
- Draft content is stored as validated Tiptap JSON.
- Autosave uses optimistic concurrency. A client submits the draft revision it edited; a stale revision returns a conflict and never silently overwrites newer work.
- Publishing requires a change summary and creates an immutable version snapshot.
- Restoring a version copies its content into a new draft; it never mutates historical versions.
- Internal links reference stable document IDs rather than slugs.
- Backlinks are derived when a draft or version is saved.
- Project permissions apply to the entire document tree in the first release.

The initial editor supports paragraphs, headings, emphasis, lists, blockquotes, code blocks, tables, links, and images. Generic file attachments can follow after the image path is proven.

## Search and templates

- PostgreSQL full-text search indexes titles and normalized published content.
- Drafts are searchable only by users allowed to edit them.
- Every result is filtered by project authorization before it leaves the service.
- The first release provides system templates for a blank page, technical specification, site overview, page/section description, technical notes, and operating instructions.
- Project Admins may create project-local templates after the system-template workflow is stable.

## Localization and appearance

- Supported locales are `ru-RU` and `en-US`.
- Russian is the default and fallback locale.
- Russian routes have no prefix; English routes use `/en`.
- UI text, validation messages, role descriptions, statuses, dates, and system templates are localized.
- User-authored document content has one language and is not automatically translated.
- Light, dark, and system themes are supported without SSR hydration flicker.

## MCP release boundary

The first MCP release supports project discovery and documentation workflows:

- List and read accessible projects.
- Read document trees, published pages, versions, and backlinks.
- Search accessible documentation.
- Create pages and update drafts.
- Publish a page when both OAuth scope and RBAC permission allow it.
- Archive and restore pages.

MCP uses Streamable HTTP and OAuth 2.1. Better Auth's OAuth Provider plugin is the authorization server. Scopes and RBAC are both required: a scope limits the delegated client, while RBAC limits the user.

Initial scopes:

- `projects:read`
- `documents:read`
- `documents:write`
- `documents:publish`

Managing users, project memberships, role matrices, global settings, and `super_admin` accounts through MCP is not part of the first release. These operations remain in the web UI until the documentation MCP path has security and audit evidence.

Every MCP mutation records the user, OAuth client, grant, scopes, tool name, project, entity, request ID, outcome, and relevant before/after metadata.

## Security and operations

- Password authentication uses Better Auth; optional TOTP and recovery codes are available to all users.
- Session, invitation, OAuth, and MCP endpoints are rate-limited.
- MCP validates `Origin`, tool schemas, OAuth audience/resource binding, scopes, and RBAC.
- Images are stored in S3-compatible storage with private objects and authorized download endpoints or short-lived signed URLs.
- PostgreSQL and object storage receive automatic backups with a documented restore test.
- Audit records are append-only through application APIs.
- Secrets, customer credentials, FTP access, and admin-panel passwords are explicitly excluded from this release.

## Acceptance criteria for the first release

- A bootstrapped `super_admin` can invite a user and create a project.
- A Project Admin can configure a safe custom role and assign it to a member.
- A Viewer cannot mutate projects or documents through UI, HTTP API, or MCP.
- An Editor can create a page, autosave a draft, resolve a stale-edit conflict, and publish a version.
- A permitted user can restore a historical version into a draft.
- Search returns relevant pages and never returns pages from inaccessible projects.
- Russian and English routes render the correct locale on first SSR response.
- An OAuth-authorized MCP client can read, edit, and publish documentation only within granted scopes and RBAC.
- Revoking the OAuth grant immediately blocks subsequent MCP requests.
- Backups can restore a test environment containing database records and images.

## Explicitly deferred

See `docs/backlog.md`. Deferred functionality is not implied by the first-release interfaces unless an accepted ADR says otherwise.

