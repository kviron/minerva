CREATE TABLE "project_icons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"updated_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_icons_project_id_unique" UNIQUE("project_id"),
	CONSTRAINT "project_icons_object_key_unique" UNIQUE("object_key"),
	CONSTRAINT "project_icons_mime_type_check" CHECK ("project_icons"."mime_type" in ('image/png', 'image/jpeg', 'image/webp')),
	CONSTRAINT "project_icons_byte_size_check" CHECK ("project_icons"."byte_size" between 1 and 2097152)
);
--> statement-breakpoint
ALTER TABLE "project_icons" ADD CONSTRAINT "project_icons_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_icons" ADD CONSTRAINT "project_icons_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_icons_updated_by_user_id_idx" ON "project_icons" USING btree ("updated_by_user_id");