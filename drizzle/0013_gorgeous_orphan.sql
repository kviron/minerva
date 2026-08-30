ALTER TABLE "project_role_permissions" DROP CONSTRAINT "project_role_permissions_permission_code_check";--> statement-breakpoint
ALTER TABLE "project_role_permissions" ADD CONSTRAINT "project_role_permissions_permission_code_check" CHECK ("project_role_permissions"."permission_code" in ('project.view', 'project.update', 'project.archive', 'project.restore', 'documents.view', 'documents.create', 'documents.update_draft', 'documents.publish', 'documents.move', 'documents.archive', 'documents.restore', 'documents.view_history', 'members.view', 'members.invite', 'members.assign_role', 'members.remove', 'roles.view', 'roles.create', 'roles.update', 'roles.delete', 'audit.view', 'credentials.view', 'credentials.create', 'credentials.update', 'credentials.archive', 'credential_categories.create', 'credential_categories.update', 'credential_categories.archive', 'credential_categories.manage_access', 'project.ai.use', 'project.ai.manage'));
--> statement-breakpoint
INSERT INTO "project_role_permissions" ("role_id", "permission_code")
SELECT role.id, defaults.permission_code
FROM "project_roles" role
INNER JOIN (
	VALUES
		('admin', 'project.ai.use'),
		('admin', 'project.ai.manage'),
		('editor', 'project.ai.use'),
		('viewer', 'project.ai.use')
) AS defaults(built_in_key, permission_code)
	ON defaults.built_in_key = role.built_in_key
WHERE role.kind = 'built_in'
ON CONFLICT (role_id, permission_code) DO NOTHING;
