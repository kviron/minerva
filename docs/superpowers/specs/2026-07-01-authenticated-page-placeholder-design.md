# Authenticated Page Placeholder Design

Status: approved in conversation, awaiting written-spec review  
Date: 2026-07-01

## Goal

Provide an intentional, reusable content state for authenticated routes whose product functionality has not been implemented yet. Apply it only to Dashboard and Project Credentials in the current slice.

## Scope

This slice adds:

- one reusable `AppPagePlaceholder` presentation component;
- a protected `/dashboard` page that renders the placeholder;
- the placeholder on the existing `/projects/[id]/credentials` route;
- route-map documentation for Project Credentials.

It does not implement Dashboard widgets, project resources, credentials storage, secret fields, APIs, database tables, permission codes, encryption, audit events, MCP tools, or project-navigation visibility. It does not replace the other existing empty route stubs.

## Component boundary

`AppPagePlaceholder` belongs in `app/components/app` because it is authenticated application-shell presentation shared by more than one feature. It is not a business feature and does not fetch data, inspect sessions, read routes, or make authorization decisions.

The component accepts optional presentation props for a page-specific title and description while providing Russian defaults equivalent to:

- title: `Страница в разработке`;
- description: `Этот раздел пока недоступен. Мы работаем над ним.`

It uses existing design-system primitives and a neutral Lucide construction icon. The state is centered within the page content region, remains readable at narrow widths, and does not introduce a card unless the existing shell requires one. The icon is decorative; the heading and description provide the accessible meaning.

## Route behavior

`/dashboard` is protected by the existing authenticated-by-default route policy and is the default authenticated destination defined by the Global Navigation design. Its current content is only `AppPagePlaceholder`.

`/projects/[id]/credentials` remains under the authenticated project route hierarchy and renders the same placeholder. Adding the placeholder does not claim that the current user may view future secrets. Project-membership and credential-specific permissions will be designed and enforced before any credential data exists.

The Credentials route is not added to `GET /api/mainMenu`. It belongs to the future project-navigation contract.

## Security boundary for future credentials

Future Project Credentials may contain logins, passwords, tokens, FTP or hosting access, and links to Figma or development environments. Secret values and ordinary resource links must not be modelled merely because the placeholder route exists.

Before credential storage is implemented, Minerva requires a separate security design and accepted ADR covering at least:

- separation of non-secret project resources from secret values;
- stable project permission codes for listing metadata, revealing values, creating, updating, archiving, and auditing access;
- encryption and key-management boundaries;
- redaction, clipboard and reveal behavior;
- append-only audit events for secret access and mutation;
- backup and restore implications;
- explicit exclusion from MCP until separately approved.

Until that design is accepted, the route exposes no credential metadata or values and performs no credential-related server request.

## Testing

Implementation uses focused tests for:

- component rendering with default and supplied copy;
- accessible heading and descriptive text;
- Dashboard rendering the shared placeholder;
- Project Credentials rendering the same shared placeholder;
- route authorization remaining enforced by the existing middleware;
- a regression assertion that the global navigation response contains no Credentials item;
- Nuxt type checking and production build.

## Acceptance criteria

- Dashboard and Project Credentials show one consistent intentional development state.
- Both pages reuse `AppPagePlaceholder`; neither duplicates its markup.
- No other empty route stub changes in this slice.
- The component contains no routing, authentication, authorization, or data-fetching logic.
- Project Credentials stores and returns no links, usernames, passwords, tokens, or other access data.
- Credentials remains absent from global navigation and MCP.
