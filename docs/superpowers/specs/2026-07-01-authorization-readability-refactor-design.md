# Authorization Readability Refactor Design

## Goal

Improve the readability and type safety of the existing route authorization implementation without changing its behavior, public contracts, database schema, or access decisions.

## Scope

This refactor makes three focused changes:

1. Move the browser-safe session shape out of the route policy and type the Identity API adapter once at the Better Auth boundary.
2. Cache the server-resolved session inside one H3 request so defense-in-depth checks do not repeat the Better Auth database lookup.
3. Represent API access levels with an `as const` object and a derived union instead of repeated string literals.

The refactor does not add project roles, permission codes, memberships, actor permissions, endpoints, public routes, Better Auth plugins, migrations, or UI behavior.

## Client session contract

Create a browser-safe Identity session contract under `shared/identity`. It contains only the session fields needed by client route policy. The current requirement is `user.superAdmin?: boolean`; database handles, tokens, raw cookies, authorization decisions, and server infrastructure types remain excluded.

The Better Auth Vue client remains encapsulated by `app/features/identity/api/auth-client.ts`. That adapter converts the library result to the shared client-safe session result once. Nuxt middleware and route policy consume the typed feature API and contain no type assertions.

The client feature must not import a server auth instance merely to obtain inferred types. This preserves the accepted dependency direction and prevents client code from depending on server implementation details. A single narrow boundary assertion is acceptable inside the adapter because Better Auth owns the runtime response and the application controls its configured additional fields.

## Request-scoped session cache

The first `requireSession(event)` call resolves the session through Better Auth and stores the successful result on the current H3 event context. A later `requireSession(event)` call for the same event returns the exact cached session without calling Better Auth again.

The cache has these constraints:

- it exists only on the H3 event and never crosses requests;
- a missing session is not cached as an authenticated result;
- authentication errors continue to use `AUTH_REQUIRED`;
- unexpected Better Auth errors propagate unchanged;
- the global API middleware and explicit handler-level guards may both remain in place without duplicate successful session lookups;
- `requireSuperAdmin` continues to receive the same server-resolved session and checks `superAdmin === true`.

This slice stores the Identity session rather than introducing a complete actor object. The later project-RBAC slice may evolve the request context into an actor containing project permission evidence.

## API access vocabulary

Replace the handwritten API access string union with one exported closed-set object:

```ts
export const API_ACCESS = {
  NOT_API: 'not-api',
  PUBLIC: 'public',
  AUTHENTICATED: 'authenticated',
  SUPER_ADMIN: 'super-admin',
} as const
```

Derive `ApiAccess` from this object and use the constants in the classifier, middleware, and tests. The exact public method/path allowlist and segment-boundary matching remain unchanged.

## Error behavior

No error contract changes:

- missing session returns HTTP `401` with `AUTH_REQUIRED`;
- authenticated non-super-administrators receive HTTP `403` with `FORBIDDEN`;
- session lookup failures in client navigation continue to abort with HTTP `503` behavior rather than redirecting to sign-in;
- unknown server errors continue to propagate to the general error boundary;
- no response exposes stack traces, database details, session tokens, cookies, or raw storage paths.

## Testing

Tests are written before implementation and prove:

- client route middleware consumes the typed Identity feature result without a local assertion;
- the existing public, authenticated, and super-administrator page decisions remain identical;
- two successful `requireSession` calls with the same event invoke the injected Better Auth resolver once and return the same session object;
- separate H3 events resolve independently;
- missing-session and unexpected-error behavior remains unchanged;
- `requireSuperAdmin` reuses the request-cached session;
- every API classification still produces the same access level through `API_ACCESS` constants;
- unit, integration, browser, typecheck, and production-build checks continue to pass.

## Acceptance criteria

- `app/middleware/auth.global.ts` contains no session type assertion.
- The browser-safe session contract lives under `shared/identity` and contains no server-only capability.
- Repeated successful session checks within one H3 request perform one Better Auth session lookup.
- Different H3 requests never share cached sessions.
- API access values have one `as const` source of truth and a derived type.
- Public routes, redirects, HTTP statuses, stable error codes, and super-administrator decisions are unchanged.
- No project RBAC vocabulary or database change is introduced.
