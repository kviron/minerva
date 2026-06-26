---
node_id: Metric:map:592bcbe13f80
title: mAP
type: Metric
source_path: D:\develop\minerva\docs\superpowers\specs\2026-06-24-minerva-ui-prototype-design.md
edges_in:
  uses_metric: [minerva-mvp-ux-ui-prototype-design]
---

# mAP

## Outgoing

_None._

## Incoming

- [[minerva-mvp-ux-ui-prototype-design]] → uses_metric

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
