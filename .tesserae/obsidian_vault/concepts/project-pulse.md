---
node_id: Synthesis:synthesis-project-pulse:edf62281b49c
title: Project Pulse
type: Synthesis
edges_out:
  summarizes: [adr-0001-use-a-modular-nuxt-nitro-monolith, adr-0002-use-global-super-administration-and-project-scoped-rbac, adr-0003-separate-mutable-drafts-from-immutable-published-versions, adr-0004-limit-the-first-mcp-release-to-documentation-workflows, adr-0005-bind-mcp-tokens-to-one-resource-and-enforce-immediate-revocation, adr-0006-use-bun-as-the-package-manager, adr-0007-separate-authentication-identity-user-profiles-contacts-and-project-roles, forgot-password-ui-design, forgot-password-ui-implementation-plan, identity-backend-foundation-design, identity-backend-foundation-implementation-plan, identity-functional-refactor-design, identity-functional-refactor-implementation-plan, minerva-agent-instructions, minerva-architecture, minerva-backlog, minerva-executable-foundation-implementation-plan, minerva-figma-prototype-implementation-plan, minerva-mvp-delivery-plan, minerva-mvp-design, minerva-mvp-route-map-design, minerva-mvp-ux-ui-prototype-design, minerva-product-specification, minerva-progress, minerva-roadmap, mvp-route-skeleton-implementation-plan, postgresql-docker-compose-design, postgresql-docker-compose-implementation-plan, reset-password-ui-design, reset-password-ui-implementation-plan, tesserae-development-memory, tesserae-refresh-wrapper-design, tesserae-refresh-wrapper-implementation-plan, user-identity-and-profile-design]
content_hash: sha256-6b0404e81529875e2992e6ace307906033b8d0060a0bea06e75ea81e115222fb
synthesis_kind: pulse
---

# Project Pulse

Top-level snapshot of the wiki at compile time.

## Outgoing

- summarizes → [[adr-0001-use-a-modular-nuxt-nitro-monolith]]
- summarizes → [[adr-0002-use-global-super-administration-and-project-scoped-rbac]]
- summarizes → [[adr-0003-separate-mutable-drafts-from-immutable-published-versions]]
- summarizes → [[adr-0004-limit-the-first-mcp-release-to-documentation-workflows]]
- summarizes → [[adr-0005-bind-mcp-tokens-to-one-resource-and-enforce-immediate-revocation]]
- summarizes → [[adr-0006-use-bun-as-the-package-manager]]
- summarizes → [[adr-0007-separate-authentication-identity-user-profiles-contacts-and-project-roles]]
- summarizes → [[forgot-password-ui-design]]
- summarizes → [[forgot-password-ui-implementation-plan]]
- summarizes → [[identity-backend-foundation-design]]
- summarizes → [[identity-backend-foundation-implementation-plan]]
- summarizes → [[identity-functional-refactor-design]]
- summarizes → [[identity-functional-refactor-implementation-plan]]
- summarizes → [[minerva-agent-instructions]]
- summarizes → [[minerva-architecture]]
- summarizes → [[minerva-backlog]]
- summarizes → [[minerva-executable-foundation-implementation-plan]]
- summarizes → [[minerva-figma-prototype-implementation-plan]]
- summarizes → [[minerva-mvp-delivery-plan]]
- summarizes → [[minerva-mvp-design]]
- summarizes → [[minerva-mvp-route-map-design]]
- summarizes → [[minerva-mvp-ux-ui-prototype-design]]
- summarizes → [[minerva-product-specification]]
- summarizes → [[minerva-progress]]
- summarizes → [[minerva-roadmap]]
- summarizes → [[mvp-route-skeleton-implementation-plan]]
- summarizes → [[postgresql-docker-compose-design]]
- summarizes → [[postgresql-docker-compose-implementation-plan]]
- summarizes → [[reset-password-ui-design]]
- summarizes → [[reset-password-ui-implementation-plan]]
- summarizes → [[tesserae-development-memory]]
- summarizes → [[tesserae-refresh-wrapper-design]]
- summarizes → [[tesserae-refresh-wrapper-implementation-plan]]
- summarizes → [[user-identity-and-profile-design]]

## Incoming

_None._

## Related (dataview)

```dataview
LIST
FROM "papers" OR "concepts" OR "claims"
WHERE contains(file.outlinks, this.file.link) AND file.name != this.file.name
SORT file.name
LIMIT 25
```

<!-- user-notes:start -->

<!-- user-notes:end -->
