CREATE TABLE "document_public_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"root_document_id" uuid NOT NULL,
	"scope" text NOT NULL,
	"token_hash" text NOT NULL,
	"token_ciphertext" text NOT NULL,
	"token_nonce" text NOT NULL,
	"token_key_version" integer NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"revoked_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_public_shares_scope_check" CHECK ("document_public_shares"."scope" in ('document', 'branch')),
	CONSTRAINT "document_public_shares_token_hash_check" CHECK (
    char_length("document_public_shares"."token_hash") = 64
    and "document_public_shares"."token_hash" ~ '^[0-9a-f]+$'
  ),
	CONSTRAINT "document_public_shares_envelope_check" CHECK (
    char_length("document_public_shares"."token_ciphertext") > 0
    and char_length("document_public_shares"."token_nonce") > 0
    and "document_public_shares"."token_key_version" > 0
  ),
	CONSTRAINT "document_public_shares_revocation_check" CHECK (
    ("document_public_shares"."revoked_at" is null and "document_public_shares"."revoked_by_user_id" is null)
    or ("document_public_shares"."revoked_at" is not null and "document_public_shares"."revoked_by_user_id" is not null)
  )
);
--> statement-breakpoint
ALTER TABLE "project_role_permissions" DROP CONSTRAINT "project_role_permissions_permission_code_check";--> statement-breakpoint
ALTER TABLE "document_public_shares" ADD CONSTRAINT "document_public_shares_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_public_shares" ADD CONSTRAINT "document_public_shares_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_public_shares" ADD CONSTRAINT "document_public_shares_revoked_by_user_id_user_id_fk" FOREIGN KEY ("revoked_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_public_shares" ADD CONSTRAINT "document_public_shares_root_document_project_fk" FOREIGN KEY ("root_document_id","project_id") REFERENCES "public"."documents"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "document_public_shares_token_hash_unique" ON "document_public_shares" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "document_public_shares_active_scope_unique" ON "document_public_shares" USING btree ("project_id","root_document_id","scope") WHERE "document_public_shares"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX "document_public_shares_root_idx" ON "document_public_shares" USING btree ("project_id","root_document_id","created_at");--> statement-breakpoint
CREATE INDEX "document_public_shares_revoked_at_idx" ON "document_public_shares" USING btree ("revoked_at");--> statement-breakpoint
ALTER TABLE "project_role_permissions" ADD CONSTRAINT "project_role_permissions_permission_code_check" CHECK ("project_role_permissions"."permission_code" in ('project.view', 'project.update', 'project.archive', 'project.restore', 'documents.view', 'documents.create', 'documents.update_draft', 'documents.publish', 'documents.move', 'documents.archive', 'documents.restore', 'documents.view_history', 'documents.share', 'members.view', 'members.invite', 'members.assign_role', 'members.remove', 'roles.view', 'roles.create', 'roles.update', 'roles.delete', 'audit.view', 'credentials.view', 'credentials.create', 'credentials.update', 'credentials.archive', 'credential_categories.create', 'credential_categories.update', 'credential_categories.archive', 'credential_categories.manage_access', 'project.ai.use', 'project.ai.manage'));--> statement-breakpoint
INSERT INTO "project_role_permissions" ("role_id", "permission_code")
SELECT role.id, 'documents.share'
FROM "project_roles" role
WHERE role.kind = 'built_in' AND role.built_in_key in ('admin', 'editor')
ON CONFLICT (role_id, permission_code) DO NOTHING;
