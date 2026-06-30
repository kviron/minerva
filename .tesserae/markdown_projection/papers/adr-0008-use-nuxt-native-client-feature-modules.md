---
node_id: SourceDocument:adr-0008-use-nuxt-native-client-feature-modules:68a6bb962563
title: ADR 0008: Use Nuxt-native client feature modules
type: SourceDocument
source_path: D:\develop\minerva\docs\decisions\0008-use-nuxt-native-feature-modules.md
edges_in:
  summarizes: [project-pulse]
source_kind: SourceDocument
---

# ADR 0008: Use Nuxt-native client feature modules

> [!abstract] Source document

## Outgoing

_None._

## Incoming

- [[project-pulse]] → summarizes

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
