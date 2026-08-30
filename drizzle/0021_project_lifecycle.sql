DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "projects"
		WHERE
			(
				"status" = 'archived'
				AND ("archived_at" IS NULL OR "archived_by_user_id" IS NULL)
			)
			OR (
				"status" <> 'archived'
				AND ("archived_at" IS NOT NULL OR "archived_by_user_id" IS NOT NULL)
			)
	) THEN
		RAISE EXCEPTION 'MINERVA_PROJECT_LIFECYCLE_PREFLIGHT_FAILED';
	END IF;
END $$;
--> statement-breakpoint
CREATE TABLE "project_lifecycle_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"transition" text NOT NULL,
	"previous_state" text NOT NULL,
	"next_state" text NOT NULL,
	"revision" integer NOT NULL,
	"reason" text,
	"actor_user_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"transition_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_lifecycle_events_project_id_revision_unique" UNIQUE("project_id","revision"),
	CONSTRAINT "project_lifecycle_events_project_id_transition_id_unique" UNIQUE("project_id","transition_id"),
	CONSTRAINT "project_lifecycle_events_transition_check" CHECK ("project_lifecycle_events"."transition" in ('pause', 'resume', 'close', 'reopen', 'archive', 'restore')),
	CONSTRAINT "project_lifecycle_events_previous_state_check" CHECK ("project_lifecycle_events"."previous_state" in ('active', 'paused', 'closed', 'archived')),
	CONSTRAINT "project_lifecycle_events_next_state_check" CHECK ("project_lifecycle_events"."next_state" in ('active', 'paused', 'closed', 'archived')),
	CONSTRAINT "project_lifecycle_events_revision_check" CHECK ("project_lifecycle_events"."revision" > 0),
	CONSTRAINT "project_lifecycle_events_reason_check" CHECK (
    "project_lifecycle_events"."reason" is null
    or (
      "project_lifecycle_events"."reason" = btrim("project_lifecycle_events"."reason")
      and char_length("project_lifecycle_events"."reason") between 1 and 500
    )
  ),
	CONSTRAINT "project_lifecycle_events_transition_state_check" CHECK (
    ("project_lifecycle_events"."transition" = 'pause' and "project_lifecycle_events"."previous_state" = 'active' and "project_lifecycle_events"."next_state" = 'paused')
    or ("project_lifecycle_events"."transition" = 'resume' and "project_lifecycle_events"."previous_state" = 'paused' and "project_lifecycle_events"."next_state" = 'active')
    or ("project_lifecycle_events"."transition" = 'close' and "project_lifecycle_events"."previous_state" in ('active', 'paused') and "project_lifecycle_events"."next_state" = 'closed')
    or ("project_lifecycle_events"."transition" = 'reopen' and "project_lifecycle_events"."previous_state" = 'closed' and "project_lifecycle_events"."next_state" = 'active')
    or ("project_lifecycle_events"."transition" = 'archive' and "project_lifecycle_events"."previous_state" = 'closed' and "project_lifecycle_events"."next_state" = 'archived')
    or ("project_lifecycle_events"."transition" = 'restore' and "project_lifecycle_events"."previous_state" = 'archived' and "project_lifecycle_events"."next_state" = 'closed')
  ),
	CONSTRAINT "project_lifecycle_events_channel_check" CHECK ("project_lifecycle_events"."channel" in ('web', 'api', 'mcp', 'system'))
);
--> statement-breakpoint
ALTER TABLE "project_role_permissions" DROP CONSTRAINT "project_role_permissions_permission_code_check";--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "projects_status_check";--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "lifecycle_revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "status_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "status_changed_by_user_id" uuid;--> statement-breakpoint
UPDATE "projects"
SET
	"status_changed_at" = COALESCE("archived_at", "created_at"),
	"status_changed_by_user_id" = COALESCE("archived_by_user_id", "created_by_user_id");--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "status_changed_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "status_changed_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "status_changed_by_user_id" SET NOT NULL;--> statement-breakpoint
CREATE FUNCTION "minerva_initialize_project_lifecycle_metadata"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	IF NEW."status_changed_by_user_id" IS NULL THEN
		NEW."status_changed_by_user_id" := NEW."created_by_user_id";
	END IF;
	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "projects_initialize_lifecycle_metadata"
BEFORE INSERT ON "projects"
FOR EACH ROW
EXECUTE FUNCTION "minerva_initialize_project_lifecycle_metadata"();--> statement-breakpoint
ALTER TABLE "project_lifecycle_events" ADD CONSTRAINT "project_lifecycle_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_lifecycle_events" ADD CONSTRAINT "project_lifecycle_events_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_lifecycle_events_project_created_at_idx" ON "project_lifecycle_events" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "project_lifecycle_events_actor_user_id_idx" ON "project_lifecycle_events" USING btree ("actor_user_id");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_status_changed_by_user_id_user_id_fk" FOREIGN KEY ("status_changed_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "projects_status_changed_by_user_id_idx" ON "projects" USING btree ("status_changed_by_user_id");--> statement-breakpoint
ALTER TABLE "project_role_permissions" ADD CONSTRAINT "project_role_permissions_permission_code_check" CHECK ("project_role_permissions"."permission_code" in ('project.view', 'project.update', 'project.pause', 'project.resume', 'project.close', 'project.reopen', 'project.archive', 'project.restore', 'documents.view', 'documents.create', 'documents.update_draft', 'documents.publish', 'documents.move', 'documents.archive', 'documents.restore', 'documents.view_history', 'documents.share', 'members.view', 'members.invite', 'members.assign_role', 'members.remove', 'roles.view', 'roles.create', 'roles.update', 'roles.delete', 'audit.view', 'credentials.view', 'credentials.create', 'credentials.update', 'credentials.archive', 'credential_categories.create', 'credential_categories.update', 'credential_categories.archive', 'credential_categories.manage_access', 'project.ai.use', 'project.ai.manage'));--> statement-breakpoint
INSERT INTO "project_role_permissions" ("role_id", "permission_code")
SELECT "project_roles"."id", "lifecycle_permissions"."permission_code"
FROM "project_roles"
CROSS JOIN (
	VALUES
		('project.pause'),
		('project.resume'),
		('project.close'),
		('project.reopen')
) AS "lifecycle_permissions"("permission_code")
WHERE "project_roles"."kind" = 'built_in' AND "project_roles"."built_in_key" = 'admin'
ON CONFLICT DO NOTHING;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_lifecycle_revision_check" CHECK ("projects"."lifecycle_revision" >= 0);--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_archive_state_check" CHECK (
    (
      "projects"."status" = 'archived'
      and "projects"."archived_at" is not null
      and "projects"."archived_by_user_id" is not null
    )
    or (
      "projects"."status" <> 'archived'
      and "projects"."archived_at" is null
      and "projects"."archived_by_user_id" is null
    )
  );--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_status_check" CHECK ("projects"."status" in ('active', 'paused', 'closed', 'archived'));
