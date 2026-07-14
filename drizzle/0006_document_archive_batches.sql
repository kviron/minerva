DROP INDEX "documents_active_project_slug_unique";--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "archive_batch_id" uuid;--> statement-breakpoint
UPDATE "documents" SET "archive_batch_id" = "id" WHERE "archived_at" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "documents_project_slug_unique" ON "documents" USING btree ("project_id","slug");--> statement-breakpoint
CREATE INDEX "documents_project_archive_batch_idx" ON "documents" USING btree ("project_id","archive_batch_id");--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_archive_state_check" CHECK (("documents"."archived_at" is null and "documents"."archive_batch_id" is null) or ("documents"."archived_at" is not null and "documents"."archive_batch_id" is not null));
