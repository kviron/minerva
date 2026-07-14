CREATE TABLE "document_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"uploaded_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "document_images_id_project_id_unique" UNIQUE("id","project_id"),
	CONSTRAINT "document_images_object_key_unique" UNIQUE("object_key"),
	CONSTRAINT "document_images_filename_check" CHECK ("document_images"."filename" = btrim("document_images"."filename") and char_length("document_images"."filename") between 1 and 200),
	CONSTRAINT "document_images_mime_type_check" CHECK ("document_images"."mime_type" in ('image/png', 'image/jpeg', 'image/gif', 'image/webp')),
	CONSTRAINT "document_images_byte_size_check" CHECK ("document_images"."byte_size" between 1 and 10485760)
);
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "draft_referenced_image_ids" uuid[] DEFAULT ARRAY[]::uuid[] NOT NULL;--> statement-breakpoint
ALTER TABLE "document_images" ADD CONSTRAINT "document_images_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_images" ADD CONSTRAINT "document_images_uploaded_by_user_id_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_images_project_created_idx" ON "document_images" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "document_images_uploaded_by_idx" ON "document_images" USING btree ("uploaded_by_user_id");