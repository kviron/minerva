# Current User Sidebar Design

Status: approved
Date: 2026-07-03

## Goal

Replace the sidebar's hard-coded demonstration user with the authenticated Better Auth user. Keep this slice limited to the identity data already present in the active session; profile records, avatar uploads, and private file delivery remain separate work.

## Selected approach

The Identity feature owns a reactive current-session adapter and a `CurrentUserMenu` UI boundary. It uses Better Auth's Vue `useSession` capability internally, normalizes the browser-safe user data, and renders the existing presentational `NavUser` component.

This preserves the accepted Nuxt feature-module boundary: the application sidebar composes features but does not import Better Auth, fetch session data, or interpret authentication state.

Rejected alternatives are:

- calling `getIdentitySession` directly from the sidebar, which would mix shell composition with Identity data loading;
- adding a separate `/api/me` endpoint, which would duplicate the existing authenticated session source without adding profile data or authorization filtering.

## Browser-safe session contract

Extend `IdentitySessionView.user` with only the fields required by the authenticated shell:

```ts
interface IdentitySessionUserView {
  readonly id: string
  readonly name: string
  readonly email: string
  readonly image?: string | null
  readonly superAdmin?: boolean
}
```

The contract excludes session tokens, cookies, account records, password data, database fields, disable reasons, private contacts, and storage paths. `superAdmin` remains available for the existing route policy; the sidebar user menu does not use it for visibility or authorization.

## Feature boundary and data flow

The existing `app/features/identity` module gains a current-user model and UI component:

```text
app/features/identity/
  api/auth-client.ts
  model/current-user.ts
  ui/CurrentUserMenu.vue
  index.ts
```

- `api/auth-client.ts` keeps the Better Auth client private and exposes the reactive session capability through an Identity-owned adapter.
- `model/current-user.ts` converts a valid session user into the small view model required by `NavUser`, including deterministic fallback initials.
- `ui/CurrentUserMenu.vue` owns pending, error, unauthenticated, and authenticated rendering.
- `index.ts` exports `CurrentUserMenu`; application-shell code does not import Identity internals.

`app/components/app/sidebar/index.vue` removes the demonstration `data` object and renders `CurrentUserMenu` in `SidebarFooter`. `NavUser` remains a presentational component: it receives normalized user data and emits profile and logout actions without reading the session itself. `CurrentUserMenu` handles those actions through Nuxt navigation and the Identity adapter.

## Display rules

The authenticated menu shows the session `name` and `email`. A trimmed `image` is accepted only when it is a same-origin root-relative URL or an absolute HTTP(S) URL; accepted values are passed to `AvatarImage`. Missing or rejected values use `AvatarFallback` with initials derived from the name. The fallback uses up to two Unicode-aware words; if the name is empty after normalization, it uses the first email character; if neither is usable, it shows a neutral user icon.

This slice does not synthesize avatar URLs, expose object-storage locations, or add upload controls. Better Auth's current `image` value is treated as optional display data, not as proof of authorization to a private file.

## Menu behavior

The menu contains only working application actions:

- `Account` is localized and navigates to `/settings/profile`;
- `Log out` is localized and calls the Identity feature's Better Auth sign-out adapter;
- the demonstration `Billing` and `Notifications` items are removed.

After successful sign-out, navigation goes to `/auth`. While sign-out is pending, the action is disabled to prevent duplicate requests. A sign-out failure keeps the current page and session visible and shows a localized, non-sensitive error.

## Loading and error behavior

During the initial reactive session load, `CurrentUserMenu` renders a sidebar-compatible skeleton that preserves footer dimensions. It does not display demonstration identity data.

If session loading fails, the footer renders a compact localized error and retry action. Raw Better Auth errors, response bodies, stack traces, cookies, and session details are never displayed.

If no authenticated session is returned inside the protected shell, the component renders no user identity and lets the existing global authentication middleware own redirect policy. It does not create a second redirect loop or weaken server-side session enforcement.

## Testing

Implementation proceeds test-first as one vertical slice and covers:

- compile-time and unit coverage for the expanded browser-safe session contract;
- current-user normalization for ordinary names, Unicode names, single-word names, email fallback, missing image, and empty identity text;
- Identity adapter coverage proving the Better Auth client remains encapsulated;
- `CurrentUserMenu` component tests for pending, authenticated, failed, retry, and missing-session states;
- `NavUser` tests for real labels, initials, optional image, profile navigation, pending logout, successful logout, and logout failure;
- sidebar composition coverage proving the demonstration object is gone and the Identity public component is used;
- browser coverage proving the signed-in user's name and email appear, profile navigation works, and logout revokes the session and reaches `/auth`;
- Nuxt type checking and production build.

## Documentation and architecture impact

No ADR is required. The design applies the accepted Better Auth identity boundary, the browser-safe session contract, and the Nuxt-native feature-module architecture without changing authentication, authorization, or profile storage decisions.

The approved user-profile design remains unchanged. Creating `user_profiles`, serving authorized private avatars, and editing profile data are explicitly deferred to their own vertical slice.

## Acceptance criteria

- The protected sidebar displays the current Better Auth user's real name and email.
- No hard-coded demonstration user, avatar, initials, Billing item, or Notifications item remains.
- A missing image produces safe, deterministic initials or a neutral fallback.
- The application sidebar depends only on the Identity feature's public API.
- Account navigation opens `/settings/profile`.
- Logout is guarded against duplicate submission, revokes the session, and navigates to `/auth` on success.
- Session and logout failures expose no sensitive or raw infrastructure details.
- Existing route authorization and server-side session enforcement remain authoritative.
