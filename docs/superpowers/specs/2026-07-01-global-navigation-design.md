# Global Navigation Design

Status: approved
Date: 2026-07-01

## Goal

Add a permission-aware global navigation endpoint and connect it to the authenticated application sidebar. Introduce a placeholder-only Dashboard as the default authenticated destination while keeping project navigation separate for the later project-RBAC slice.

## Scope

This slice includes:

- a protected `/dashboard` page using the approved shared development placeholder;
- `/dashboard` as the destination after sign-in and from the authenticated root route;
- the protected global-navigation HTTP endpoint;
- server-side filtering of the Administration item from the current session's `superAdmin` flag;
- a typed client Navigation feature and its sidebar presentation;
- Russian and English translation keys and a closed Lucide icon registry.

It does not add project navigation, project memberships, project roles, permission tables, project settings visibility, Dashboard widgets, project credentials, or new global roles. Project navigation will use a separate permission-aware contract after project RBAC exists.

## Selected approach

The server returns the already-filtered global navigation. The client localizes labels, resolves icons through a local allowlist, and renders the result. This keeps visibility decisions at the authenticated server boundary while preventing transport contracts from depending on Vue or Lucide components.

The rejected alternatives are:

- returning authorization facts and rebuilding the menu in the client, which would duplicate visibility rules in UI code;
- keeping a static client menu and reading `superAdmin` in the sidebar, which would make the endpoint redundant and couple presentation to authorization state.

Navigation visibility remains a usability feature. Route middleware and Nitro endpoints continue to enforce authorization independently.

## Global navigation contract

`GET /api/mainMenu` requires an active session and returns an ordered array of items with this browser-safe shape:

```ts
interface GlobalNavigationItem {
  id: GlobalNavigationItemId
  labelKey: GlobalNavigationLabelKey
  to: GlobalNavigationPath
  icon: GlobalNavigationIcon
}
```

The closed vocabulary is:

| `id` | `labelKey` | `to` | `icon` | Visibility |
| --- | --- | --- | --- | --- |
| `dashboard` | `navigation.dashboard` | `/dashboard` | `layout-dashboard` | Every authenticated user |
| `projects` | `navigation.projects` | `/projects` | `folder-kanban` | Every authenticated user |
| `settings` | `navigation.settings` | `/settings` | `settings` | Every authenticated user |
| `administration` | `navigation.administration` | `/administration` | `shield-check` | `superAdmin === true` only |

The item, identifier, label-key, path, and icon types live in `shared/navigation`. Shared code contains no Vue components, dynamic imports, session data, or authorization decisions.

## Server boundary

The Nitro handler remains a thin adapter. It resolves the session through the existing `requireSession` capability and calls a Navigation application service that builds the ordered response from the authenticated actor.

The service checks the global boolean `superAdmin`; it never checks a localized role name. Project roles and permissions do not participate in the global menu. The Administration route and APIs retain their existing independent super-administrator guards.

## Client feature boundary

Global navigation is a coherent client capability and follows the accepted Nuxt-native feature-module architecture:

```text
app/features/navigation/
  api/global-navigation-api.ts
  model/use-global-navigation.ts
  ui/GlobalNavigation.vue
  index.ts
```

- `api/global-navigation-api.ts` owns the typed HTTP request.
- `model/use-global-navigation.ts` owns loading, success, error, retry, active-route derivation, and safe icon resolution.
- `ui/GlobalNavigation.vue` renders menu items and states with design-system primitives.
- `index.ts` exports only the public `GlobalNavigation` component.

`app/components/app/sidebar/index.vue` imports the feature through its public API. The sidebar remains responsible for shell composition, header, content, and footer; it does not fetch navigation data or interpret authorization state.

Profile data and the footer user menu remain outside this endpoint and feature.

## Sidebar behavior

The feature renders links with `NuxtLink` and derives the active item from the current route. Exact routes and descendants activate their owning global destination where appropriate.

While the request is pending, the feature uses the existing design-system `SidebarMenuSkeleton` with icon placeholders. It does not introduce a custom skeleton.

The client maps the four allowed icon identifiers to statically imported Lucide components. It never dynamically imports a component from a server-provided string. An unknown icon uses a safe fallback and surfaces a contract error during development.

The client localizes `labelKey` through the application i18n layer. Russian remains the default and fallback locale; English uses the same stable keys.

## Routing changes

- `/dashboard` is a protected, initially empty page.
- Authenticated `/` redirects to `/dashboard`; unauthenticated `/` redirects to `/auth`.
- Successful sign-in uses `/dashboard` as its default destination.
- An authenticated user opening `/auth` is redirected to `/dashboard`.
- A non-super-administrator denied access to `/administration/**` is redirected to `/dashboard`.
- `/projects` remains the accessible-project list, not the authenticated landing page.

## Error behavior

- Missing, expired, revoked, or inactive sessions retain the existing `AUTH_REQUIRED` behavior and authentication flow.
- Other navigation-load failures render a compact localized error with a retry action inside the sidebar.
- Raw server messages, stack traces, session data, role names, and internal authorization details are never rendered.
- A failed menu request does not weaken direct route or API authorization.

## Testing

Implementation proceeds in vertical TDD steps and covers:

- shared contract tests for the closed item and icon vocabulary;
- service unit tests proving ordinary users receive three ordered items and super-administrators receive four;
- client model tests for loading, success, retry, active-route behavior, and safe icon fallback;
- component tests for the existing `SidebarMenuSkeleton`, links, localized labels, errors, and retry;
- Nitro integration tests for session enforcement and Administration filtering;
- browser tests proving sign-in and authenticated root navigation land on `/dashboard`, the global links work, and direct Administration access remains protected;
- Nuxt type checking and production build.

## Documentation impact

The approved MVP route map and route-authorization design are updated to make Dashboard the authenticated landing destination. No ADR is required because this design applies the existing modular-monolith, global-super-administration, and Nuxt feature-module decisions without changing their architecture or security model.

## Acceptance criteria

- An authenticated ordinary user sees Dashboard, Projects, and Settings in the documented order.
- A current super-administrator additionally sees Administration.
- `/dashboard` exists, is protected, and is the default authenticated destination.
- The sidebar obtains navigation only through the Navigation feature public API.
- Loading uses the existing `SidebarMenuSkeleton` from the design system.
- Labels are localized from stable keys, and icons resolve only through the closed client registry.
- Project navigation is absent from the global endpoint.
- Hiding Administration never replaces server-side route or API enforcement.
