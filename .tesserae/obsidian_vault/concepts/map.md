---
node_id: Metric:map:592bcbe13f80
title: mAP
type: Metric
source_path: D:\develop\minerva\docs\progress.md
edges_in:
  summarizes: [minerva-mvp-identity-planning]
  uses_metric: [identity-backend-foundation-design, identity-backend-foundation-implementation-plan, identity-functional-refactor-implementation-plan, minerva-mvp-route-map-design, minerva-mvp-ux-ui-prototype-design, minerva-progress, mvp-route-skeleton-implementation-plan, nuxt-feature-modules-design, nuxt-feature-modules-implementation-plan]
---

# mAP

## Outgoing

_None._

## Incoming

- [[minerva-mvp-identity-planning]] → summarizes
- [[identity-backend-foundation-design]] → uses_metric
- [[identity-backend-foundation-implementation-plan]] → uses_metric
- [[identity-functional-refactor-implementation-plan]] → uses_metric
- [[minerva-mvp-route-map-design]] → uses_metric
- [[minerva-mvp-ux-ui-prototype-design]] → uses_metric
- [[minerva-progress]] → uses_metric
- [[mvp-route-skeleton-implementation-plan]] → uses_metric
- [[nuxt-feature-modules-design]] → uses_metric
- [[nuxt-feature-modules-implementation-plan]] → uses_metric

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
