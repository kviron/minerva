---
node_id: Metric:map:592bcbe13f80
title: mAP
type: Metric
source_path: D:\develop\minerva\docs\progress.md
edges_in:
  summarizes: [minerva-mvp-planning]
  uses_metric: [minerva-mvp-route-map-design, minerva-mvp-ux-ui-prototype-design, minerva-progress, mvp-route-skeleton-implementation-plan]
---

# mAP

## Outgoing

_None._

## Incoming

- [[minerva-mvp-planning]] → summarizes
- [[minerva-mvp-route-map-design]] → uses_metric
- [[minerva-mvp-ux-ui-prototype-design]] → uses_metric
- [[minerva-progress]] → uses_metric
- [[mvp-route-skeleton-implementation-plan]] → uses_metric

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
