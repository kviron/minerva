ALTER TABLE "projects" ADD COLUMN "description_content" jsonb DEFAULT '{"type":"doc","content":[]}'::jsonb NOT NULL;
--> statement-breakpoint
UPDATE "projects"
SET "description_content" = jsonb_build_object(
  'type', 'doc',
  'content', jsonb_build_array(jsonb_build_object(
    'type', 'paragraph',
    'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', "description"))
  ))
)
WHERE "description" IS NOT NULL AND btrim("description") <> '';
