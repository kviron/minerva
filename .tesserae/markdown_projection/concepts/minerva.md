---
node_id: CodeProject:minerva:a939ffff79a4
title: minerva
type: CodeProject
source_path: D:\develop\minerva
layer: project
source_kind: CodeProject
---

# minerva

Development code project at D:\develop\minerva

## Outgoing

_None._

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
