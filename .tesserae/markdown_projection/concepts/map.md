---
node_id: Metric:map:592bcbe13f80
title: mAP
type: Metric
source_path: D:\develop\minerva\docs\progress.md
edges_in:
  summarizes: [minerva-mvp-blueprint]
  uses_metric: [authenticated-page-placeholder-design, current-user-sidebar-implementation-plan, global-navigation-and-page-placeholder-implementation-plan, global-navigation-design, header-theme-toggle-implementation-plan, identity-backend-foundation-design, identity-backend-foundation-implementation-plan, identity-functional-refactor-implementation-plan, minerva-mvp-route-map-design, minerva-mvp-ux-ui-prototype-design, minerva-progress, mvp-route-skeleton-implementation-plan, nuxt-feature-modules-design, nuxt-feature-modules-implementation-plan, project-ai-assistant-design, projects-and-rbac-foundation-implementation-plan, projects-list-and-create-ui-design, projects-list-and-create-ui-implementation-plan]
---

# mAP

## Outgoing

_None._

## Incoming

- [[minerva-mvp-blueprint]] → summarizes
- [[authenticated-page-placeholder-design]] → uses_metric
- [[current-user-sidebar-implementation-plan]] → uses_metric
- [[global-navigation-and-page-placeholder-implementation-plan]] → uses_metric
- [[global-navigation-design]] → uses_metric
- [[header-theme-toggle-implementation-plan]] → uses_metric
- [[identity-backend-foundation-design]] → uses_metric
- [[identity-backend-foundation-implementation-plan]] → uses_metric
- [[identity-functional-refactor-implementation-plan]] → uses_metric
- [[minerva-mvp-route-map-design]] → uses_metric
- [[minerva-mvp-ux-ui-prototype-design]] → uses_metric
- [[minerva-progress]] → uses_metric
- [[mvp-route-skeleton-implementation-plan]] → uses_metric
- [[nuxt-feature-modules-design]] → uses_metric
- [[nuxt-feature-modules-implementation-plan]] → uses_metric
- [[project-ai-assistant-design]] → uses_metric
- [[projects-and-rbac-foundation-implementation-plan]] → uses_metric
- [[projects-list-and-create-ui-design]] → uses_metric
- [[projects-list-and-create-ui-implementation-plan]] → uses_metric

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
