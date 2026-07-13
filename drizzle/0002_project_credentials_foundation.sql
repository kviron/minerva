CREATE TABLE "credential_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by_user_id" uuid,
	CONSTRAINT "credential_categories_id_project_id_unique" UNIQUE("id","project_id"),
	CONSTRAINT "credential_categories_name_check" CHECK ("credential_categories"."name" = btrim("credential_categories"."name") and char_length("credential_categories"."name") between 1 and 120),
	CONSTRAINT "credential_categories_normalized_name_check" CHECK ("credential_categories"."normalized_name" = btrim("credential_categories"."normalized_name") and char_length("credential_categories"."normalized_name") between 1 and 120),
	CONSTRAINT "credential_categories_description_check" CHECK ("credential_categories"."description" is null or ("credential_categories"."description" = btrim("credential_categories"."description") and char_length("credential_categories"."description") <= 2000)),
	CONSTRAINT "credential_categories_position_check" CHECK ("credential_categories"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "credential_category_member_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credential_category_member_grants_category_membership_unique" UNIQUE("category_id","membership_id")
);
--> statement-breakpoint
CREATE TABLE "credential_category_role_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credential_category_role_grants_category_role_unique" UNIQUE("category_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "credential_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"credential_id" uuid NOT NULL,
	"label" text NOT NULL,
	"type" text NOT NULL,
	"position" integer NOT NULL,
	"ciphertext" text NOT NULL,
	"nonce" text NOT NULL,
	"key_version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credential_fields_credential_id_position_unique" UNIQUE("credential_id","position"),
	CONSTRAINT "credential_fields_label_check" CHECK ("credential_fields"."label" = btrim("credential_fields"."label") and char_length("credential_fields"."label") between 1 and 120),
	CONSTRAINT "credential_fields_type_check" CHECK ("credential_fields"."type" in ('text', 'secret', 'url', 'note')),
	CONSTRAINT "credential_fields_position_check" CHECK ("credential_fields"."position" >= 0),
	CONSTRAINT "credential_fields_key_version_check" CHECK ("credential_fields"."key_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"title" text NOT NULL,
	"login_ciphertext" text,
	"login_nonce" text,
	"login_key_version" integer,
	"password_ciphertext" text,
	"password_nonce" text,
	"password_key_version" integer,
	"created_by_user_id" uuid NOT NULL,
	"updated_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by_user_id" uuid,
	CONSTRAINT "credentials_id_project_id_unique" UNIQUE("id","project_id"),
	CONSTRAINT "credentials_title_check" CHECK ("credentials"."title" = btrim("credentials"."title") and char_length("credentials"."title") between 1 and 200),
	CONSTRAINT "credentials_login_envelope_check" CHECK (("credentials"."login_ciphertext" is null and "credentials"."login_nonce" is null and "credentials"."login_key_version" is null) or ("credentials"."login_ciphertext" is not null and "credentials"."login_nonce" is not null and "credentials"."login_key_version" > 0)),
	CONSTRAINT "credentials_password_envelope_check" CHECK (("credentials"."password_ciphertext" is null and "credentials"."password_nonce" is null and "credentials"."password_key_version" is null) or ("credentials"."password_ciphertext" is not null and "credentials"."password_nonce" is not null and "credentials"."password_key_version" > 0))
);
--> statement-breakpoint
ALTER TABLE "project_role_permissions" DROP CONSTRAINT "project_role_permissions_permission_code_check";--> statement-breakpoint
ALTER TABLE "project_memberships" ADD CONSTRAINT "project_memberships_id_project_id_unique" UNIQUE("id","project_id");--> statement-breakpoint
ALTER TABLE "credential_categories" ADD CONSTRAINT "credential_categories_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_categories" ADD CONSTRAINT "credential_categories_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_categories" ADD CONSTRAINT "credential_categories_archived_by_user_id_user_id_fk" FOREIGN KEY ("archived_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_category_member_grants" ADD CONSTRAINT "credential_category_member_grants_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_category_member_grants" ADD CONSTRAINT "credential_category_member_grants_category_project_fk" FOREIGN KEY ("category_id","project_id") REFERENCES "public"."credential_categories"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_category_member_grants" ADD CONSTRAINT "credential_category_member_grants_membership_project_fk" FOREIGN KEY ("membership_id","project_id") REFERENCES "public"."project_memberships"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_category_role_grants" ADD CONSTRAINT "credential_category_role_grants_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_category_role_grants" ADD CONSTRAINT "credential_category_role_grants_category_project_fk" FOREIGN KEY ("category_id","project_id") REFERENCES "public"."credential_categories"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_category_role_grants" ADD CONSTRAINT "credential_category_role_grants_role_project_fk" FOREIGN KEY ("role_id","project_id") REFERENCES "public"."project_roles"("id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_fields" ADD CONSTRAINT "credential_fields_credential_id_credentials_id_fk" FOREIGN KEY ("credential_id") REFERENCES "public"."credentials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_archived_by_user_id_user_id_fk" FOREIGN KEY ("archived_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_category_project_fk" FOREIGN KEY ("category_id","project_id") REFERENCES "public"."credential_categories"("id","project_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "credential_categories_active_name_unique" ON "credential_categories" USING btree ("project_id","normalized_name") WHERE "credential_categories"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "credential_categories_project_id_position_idx" ON "credential_categories" USING btree ("project_id","position");--> statement-breakpoint
CREATE INDEX "credential_category_member_grants_membership_id_idx" ON "credential_category_member_grants" USING btree ("membership_id");--> statement-breakpoint
CREATE INDEX "credential_category_role_grants_role_id_idx" ON "credential_category_role_grants" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "credential_fields_credential_id_idx" ON "credential_fields" USING btree ("credential_id");--> statement-breakpoint
CREATE INDEX "credentials_category_id_updated_at_idx" ON "credentials" USING btree ("category_id","updated_at");--> statement-breakpoint
ALTER TABLE "project_role_permissions" ADD CONSTRAINT "project_role_permissions_permission_code_check" CHECK ("project_role_permissions"."permission_code" in ('project.view', 'project.update', 'project.archive', 'project.restore', 'documents.view', 'documents.create', 'documents.update_draft', 'documents.publish', 'documents.move', 'documents.archive', 'documents.restore', 'documents.view_history', 'members.view', 'members.invite', 'members.assign_role', 'members.remove', 'roles.view', 'roles.create', 'roles.update', 'roles.delete', 'audit.view', 'credentials.view', 'credentials.create', 'credentials.update', 'credentials.archive', 'credential_categories.create', 'credential_categories.update', 'credential_categories.archive', 'credential_categories.manage_access'));
--> statement-breakpoint
INSERT INTO "project_role_permissions" ("role_id", "permission_code")
SELECT r.id, p.permission_code
FROM "project_roles" r
CROSS JOIN (
	VALUES
		('credentials.view'),
		('credentials.create'),
		('credentials.update'),
		('credentials.archive'),
		('credential_categories.create'),
		('credential_categories.update'),
		('credential_categories.archive'),
		('credential_categories.manage_access')
) AS p(permission_code)
WHERE r.kind = 'built_in' AND r.built_in_key = 'admin'
ON CONFLICT (role_id, permission_code) DO NOTHING;
