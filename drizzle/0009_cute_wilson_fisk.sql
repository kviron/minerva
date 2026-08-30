ALTER TABLE "document_versions" ADD COLUMN "search_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "draft_search_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE FUNCTION minerva_document_search_vector(document_title text, document_text text)
RETURNS tsvector
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT
    setweight(to_tsvector('russian', coalesce(document_title, '')), 'A') ||
    setweight(to_tsvector('russian', coalesce(document_text, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(document_title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(document_text, '')), 'B')
$$;--> statement-breakpoint
UPDATE "documents"
SET "draft_search_text" = coalesce((
  SELECT string_agg(value, ' ')
  FROM jsonb_array_elements_text(
    jsonb_path_query_array("draft_content", '$.**.text') ||
    jsonb_path_query_array("draft_content", '$.**.attrs.alt')
  ) AS search_value(value)
), '');--> statement-breakpoint
UPDATE "document_versions"
SET "search_text" = coalesce((
  SELECT string_agg(value, ' ')
  FROM jsonb_array_elements_text(
    jsonb_path_query_array("draft_content", '$.**.text') ||
    jsonb_path_query_array("draft_content", '$.**.attrs.alt')
  ) AS search_value(value)
), '');--> statement-breakpoint
CREATE INDEX "document_versions_search_idx" ON "document_versions" USING gin (minerva_document_search_vector("title", "search_text"));--> statement-breakpoint
CREATE INDEX "documents_draft_search_idx" ON "documents" USING gin (minerva_document_search_vector("title", "draft_search_text"));
