# Minerva MVP route map design

Status: approved for later implementation
Date: 2026-06-27

## Scope

This document defines the Nuxt page skeleton required for the Minerva MVP. It does not authorize application implementation and does not include deferred backlog areas.

## Chosen approach

Use domain-oriented nested routes. Project documents and project administration remain under the owning project, while global administration and personal settings have separate route groups.

The alternatives were rejected for the following reasons:

- A skeleton limited to the eight prototype screens omits invitation enrollment, global administration, personal security, and MCP grant management required by the MVP.
- A separate route for every tab, dialog, and action creates unnecessary navigation and page files before those flows justify them.

## Route map

```text
/
|-- auth/
|-- invitations/[token]
|-- projects/
|-- projects/[id]/
|   |-- documents/[documentId]/
|   |   |-- edit
|   |   `-- history
|   `-- settings
|-- administration/
|   |-- users
|   |-- invitations
|   `-- audit
`-- settings/
    |-- profile
    |-- security
    `-- connections
```

## Route responsibilities

- `/` redirects authenticated users to `/projects` and unauthenticated users to `/auth`.
- `/auth` contains sign-in. Public registration is absent.
- `/invitations/[token]` handles global and project-bound invitation enrollment.
- `/projects` lists accessible projects and contains project creation as a permission-aware dialog.
- `/projects/[id]` is the project overview and owns the contextual document-tree sidebar.
- `/projects/[id]/documents/[documentId]` opens a document in reading mode.
- The nested `edit` and `history` routes represent explicit editing and immutable version history.
- `/projects/[id]/settings` is one page with General, Members, Roles and permissions, and Audit tabs.
- `/administration` is restricted to `super_admin` and groups global users, invitations, and audit browsing.
- `/settings` groups the current user's profile, security controls, sessions, and OAuth/MCP grants.

## Flows without separate pages

- Global documentation search uses a command dialog.
- Project creation, document publication, and version restoration use dialogs.
- Project archives are exposed as a projects-list filter.
- Templates and images are part of document creation and editing workflows.
- Project settings tabs may use query state for direct linking without becoming separate Nuxt pages.

## Layout boundaries

- Authentication and invitation enrollment use a public layout.
- Projects, administration, and personal settings use the authenticated global shell.
- Project overview, documents, and project settings add the contextual project sidebar.
- Navigation visibility reflects server-provided permissions but never replaces server-side authorization.

## Current skeleton impact

- The existing `/dashboard` route is not part of the approved MVP map.
- The existing `app/pages/projects/[id].vue` will need to become `app/pages/projects/[id]/index.vue` before nested project routes are added.
- The existing global `settings` route remains distinct from project settings.

## Later implementation checks

- Verify root redirects for authenticated and unauthenticated users.
- Verify route middleware denies inaccessible projects and unauthorized administration pages without leaking resource existence.
- Verify Russian routes have no locale prefix and English routes use `/en` through the localization layer rather than duplicated page files.
- Verify direct links to document editing, history, settings tabs, and OAuth/MCP grant management preserve authorization behavior.
