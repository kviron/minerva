# minerva Dashboard

## Recent generated pages

```dataview
TABLE type, source_path
FROM "papers" OR "concepts" OR "claims"
SORT file.mtime DESC
LIMIT 25
```

## Papers

```dataview
TABLE source_path, analysis_date
FROM "papers"
SORT file.name ASC
```

## Concepts and claims

```dataview
TABLE type
FROM "concepts" OR "claims"
SORT type ASC, file.name ASC
```
