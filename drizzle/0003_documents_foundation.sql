CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"parent_id" uuid,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"draft_revision" integer DEFAULT 0 NOT NULL,
	"draft_content" jsonb DEFAULT '{"type":"doc","content":[]}'::jsonb NOT NULL,
	"publication_state" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by_user_id" uuid,
	CONSTRAINT "documents_id_project_id_unique" UNIQUE("id","project_id"),
	CONSTRAINT "documents_title_check" CHECK ("documents"."title" = btrim("documents"."title") and char_length("documents"."title") between 1 and 200),
	CONSTRAINT "documents_slug_check" CHECK ("documents"."slug" = lower(btrim("documents"."slug")) and "documents"."slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length("documents"."slug") between 1 and 160),
	CONSTRAINT "documents_position_check" CHECK ("documents"."position" >= 0),
	CONSTRAINT "documents_draft_revision_check" CHECK ("documents"."draft_revision" >= 0),
	CONSTRAINT "documents_publication_state_check" CHECK ("documents"."publication_state" in ('draft', 'published'))
);
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_archived_by_user_id_user_id_fk" FOREIGN KEY ("archived_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_parent_project_fk" FOREIGN KEY ("parent_id","project_id") REFERENCES "public"."documents"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "documents_active_project_slug_unique" ON "documents" USING btree ("project_id","slug") WHERE "documents"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "documents_project_parent_position_idx" ON "documents" USING btree ("project_id","parent_id","position");--> statement-breakpoint
CREATE INDEX "documents_owner_user_id_idx" ON "documents" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "documents_archived_by_user_id_idx" ON "documents" USING btree ("archived_by_user_id");