CREATE TABLE "document_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"source_draft_revision" integer NOT NULL,
	"title" text NOT NULL,
	"draft_content" jsonb NOT NULL,
	"internal_link_target_ids" uuid[] DEFAULT ARRAY[]::uuid[] NOT NULL,
	"referenced_image_ids" uuid[] DEFAULT ARRAY[]::uuid[] NOT NULL,
	"change_summary" text NOT NULL,
	"published_by_user_id" uuid NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_versions_document_number_unique" UNIQUE("document_id","version_number"),
	CONSTRAINT "document_versions_number_check" CHECK ("document_versions"."version_number" > 0),
	CONSTRAINT "document_versions_source_revision_check" CHECK ("document_versions"."source_draft_revision" >= 0),
	CONSTRAINT "document_versions_title_check" CHECK ("document_versions"."title" = btrim("document_versions"."title") and char_length("document_versions"."title") between 1 and 200),
	CONSTRAINT "document_versions_change_summary_check" CHECK ("document_versions"."change_summary" = btrim("document_versions"."change_summary") and char_length("document_versions"."change_summary") between 1 and 1000)
);
--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_published_by_user_id_user_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_project_fk" FOREIGN KEY ("document_id","project_id") REFERENCES "public"."documents"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_versions_project_document_idx" ON "document_versions" USING btree ("project_id","document_id","version_number");--> statement-breakpoint
CREATE INDEX "document_versions_published_by_user_id_idx" ON "document_versions" USING btree ("published_by_user_id");