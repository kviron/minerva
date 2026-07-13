---
node_id: Synthesis:synthesis-project-pulse:edf62281b49c
title: Project Pulse
type: Synthesis
edges_out:
  summarizes: [adr-0001-use-a-modular-nuxt-nitro-monolith, adr-0002-use-global-super-administration-and-project-scoped-rbac, adr-0003-separate-mutable-drafts-from-immutable-published-versions, adr-0004-limit-the-first-mcp-release-to-documentation-workflows, adr-0005-bind-mcp-tokens-to-one-resource-and-enforce-immediate-revocation, adr-0006-use-bun-as-the-package-manager, adr-0007-separate-authentication-identity-user-profiles-contacts-and-project-roles, adr-0008-use-nuxt-native-client-feature-modules, adr-0009-anonymize-deleted-user-accounts-while-preserving-identity-references, adr-0010-store-encrypted-project-credentials-with-category-scoped-access, adr-0011-display-credential-logins-in-authorized-project-lists, adr-0012-use-feature-scoped-actions-for-client-effects, adr-0013-keep-client-actions-stateless-and-feature-scoped, adr-0014-search-authorized-encrypted-credential-values-server-side, authenticated-page-placeholder-design, authorization-readability-refactor-design, authorization-readability-refactor-implementation-plan, credential-encryption-operations, current-user-sidebar-design, current-user-sidebar-implementation-plan, forgot-password-ui-design, forgot-password-ui-implementation-plan, global-navigation-and-page-placeholder-implementation-plan, global-navigation-design, header-theme-toggle-design, header-theme-toggle-implementation-plan, identity-backend-foundation-design, identity-backend-foundation-implementation-plan, identity-functional-refactor-design, identity-functional-refactor-implementation-plan, minerva-agent-instructions, minerva-architecture, minerva-backlog, minerva-executable-foundation-implementation-plan, minerva-figma-prototype-implementation-plan, minerva-mvp-delivery-plan, minerva-mvp-design, minerva-mvp-route-map-design, minerva-mvp-ux-ui-prototype-design, minerva-product-specification, minerva-progress, minerva-roadmap, mvp-route-skeleton-implementation-plan, nuxt-feature-modules-design, nuxt-feature-modules-implementation-plan, postgresql-docker-compose-design, postgresql-docker-compose-implementation-plan, project-credentials-design, project-credentials-implementation-plan, projects-and-rbac-foundation-design, projects-and-rbac-foundation-implementation-plan, projects-list-and-create-ui-design, projects-list-and-create-ui-implementation-plan, reset-password-ui-design, reset-password-ui-implementation-plan, route-authorization-design, route-authorization-implementation-plan, tesserae-development-memory, tesserae-refresh-wrapper-design, tesserae-refresh-wrapper-implementation-plan, user-identity-and-profile-design]
content_hash: sha256-0381a81ebbd08022e334e15cae64627898fa86de05204c2a97ef14e7623787cf
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
- summarizes → [[adr-0008-use-nuxt-native-client-feature-modules]]
- summarizes → [[adr-0009-anonymize-deleted-user-accounts-while-preserving-identity-references]]
- summarizes → [[adr-0010-store-encrypted-project-credentials-with-category-scoped-access]]
- summarizes → [[adr-0011-display-credential-logins-in-authorized-project-lists]]
- summarizes → [[adr-0012-use-feature-scoped-actions-for-client-effects]]
- summarizes → [[adr-0013-keep-client-actions-stateless-and-feature-scoped]]
- summarizes → [[adr-0014-search-authorized-encrypted-credential-values-server-side]]
- summarizes → [[authenticated-page-placeholder-design]]
- summarizes → [[authorization-readability-refactor-design]]
- summarizes → [[authorization-readability-refactor-implementation-plan]]
- summarizes → [[credential-encryption-operations]]
- summarizes → [[current-user-sidebar-design]]
- summarizes → [[current-user-sidebar-implementation-plan]]
- summarizes → [[forgot-password-ui-design]]
- summarizes → [[forgot-password-ui-implementation-plan]]
- summarizes → [[global-navigation-and-page-placeholder-implementation-plan]]
- summarizes → [[global-navigation-design]]
- summarizes → [[header-theme-toggle-design]]
- summarizes → [[header-theme-toggle-implementation-plan]]
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
- summarizes → [[nuxt-feature-modules-design]]
- summarizes → [[nuxt-feature-modules-implementation-plan]]
- summarizes → [[postgresql-docker-compose-design]]
- summarizes → [[postgresql-docker-compose-implementation-plan]]
- summarizes → [[project-credentials-design]]
- summarizes → [[project-credentials-implementation-plan]]
- summarizes → [[projects-and-rbac-foundation-design]]
- summarizes → [[projects-and-rbac-foundation-implementation-plan]]
- summarizes → [[projects-list-and-create-ui-design]]
- summarizes → [[projects-list-and-create-ui-implementation-plan]]
- summarizes → [[reset-password-ui-design]]
- summarizes → [[reset-password-ui-implementation-plan]]
- summarizes → [[route-authorization-design]]
- summarizes → [[route-authorization-implementation-plan]]
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
