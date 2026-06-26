---
node_id: Synthesis:synthesis-project-pulse:edf62281b49c
title: Project Pulse
type: Synthesis
edges_out:
  summarizes: [adr-0001-use-a-modular-nuxt-nitro-monolith, adr-0002-use-global-super-administration-and-project-scoped-rbac, adr-0003-separate-mutable-drafts-from-immutable-published-versions, adr-0004-limit-the-first-mcp-release-to-documentation-workflows, adr-0005-bind-mcp-tokens-to-one-resource-and-enforce-immediate-revocation, adr-0006-use-bun-as-the-package-manager, minerva-agent-instructions, minerva-architecture, minerva-backlog, minerva-executable-foundation-implementation-plan, minerva-figma-prototype-implementation-plan, minerva-mvp-delivery-plan, minerva-mvp-design, minerva-mvp-ux-ui-prototype-design, minerva-product-specification, minerva-progress, minerva-roadmap, tesserae-development-memory]
content_hash: sha256-6db8cdb45f11bbd5d8713266a83ee4ae49794a316b03aa4e60e13d8866623e63
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
- summarizes → [[minerva-agent-instructions]]
- summarizes → [[minerva-architecture]]
- summarizes → [[minerva-backlog]]
- summarizes → [[minerva-executable-foundation-implementation-plan]]
- summarizes → [[minerva-figma-prototype-implementation-plan]]
- summarizes → [[minerva-mvp-delivery-plan]]
- summarizes → [[minerva-mvp-design]]
- summarizes → [[minerva-mvp-ux-ui-prototype-design]]
- summarizes → [[minerva-product-specification]]
- summarizes → [[minerva-progress]]
- summarizes → [[minerva-roadmap]]
- summarizes → [[tesserae-development-memory]]

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
