CREATE TABLE "mcp_idempotency_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grant_id" uuid NOT NULL,
	"tool_name" text NOT NULL,
	"project_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_hash" text NOT NULL,
	"status" text NOT NULL,
	"lease_token" uuid,
	"lease_expires_at" timestamp with time zone,
	"safe_result" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"retention_expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "mcp_idempotency_scope_unique" UNIQUE("grant_id","tool_name","project_id","idempotency_key"),
	CONSTRAINT "mcp_idempotency_tool_name_check" CHECK (
    "mcp_idempotency_records"."tool_name" = btrim("mcp_idempotency_records"."tool_name")
    and char_length("mcp_idempotency_records"."tool_name") between 1 and 128
    and "mcp_idempotency_records"."tool_name" ~ '^[a-z0-9_]+$'
  ),
	CONSTRAINT "mcp_idempotency_key_check" CHECK (
    "mcp_idempotency_records"."idempotency_key" = btrim("mcp_idempotency_records"."idempotency_key")
    and char_length("mcp_idempotency_records"."idempotency_key") between 1 and 128
  ),
	CONSTRAINT "mcp_idempotency_request_hash_check" CHECK ("mcp_idempotency_records"."request_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "mcp_idempotency_state_check" CHECK (
    ("mcp_idempotency_records"."status" = 'in_progress'
      and "mcp_idempotency_records"."lease_token" is not null
      and "mcp_idempotency_records"."lease_expires_at" is not null
      and "mcp_idempotency_records"."safe_result" is null)
    or
    ("mcp_idempotency_records"."status" = 'completed'
      and "mcp_idempotency_records"."lease_token" is null
      and "mcp_idempotency_records"."lease_expires_at" is null
      and "mcp_idempotency_records"."safe_result" is not null)
  ),
	CONSTRAINT "mcp_idempotency_retention_check" CHECK (
    "mcp_idempotency_records"."retention_expires_at" > "mcp_idempotency_records"."created_at"
    and "mcp_idempotency_records"."retention_expires_at" <= "mcp_idempotency_records"."created_at" + interval '7 days'
    and ("mcp_idempotency_records"."lease_expires_at" is null or "mcp_idempotency_records"."lease_expires_at" <= "mcp_idempotency_records"."retention_expires_at")
  )
);
--> statement-breakpoint
ALTER TABLE "mcp_idempotency_records" ADD CONSTRAINT "mcp_idempotency_records_grant_id_oauth_grants_id_fk" FOREIGN KEY ("grant_id") REFERENCES "public"."oauth_grants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_idempotency_records" ADD CONSTRAINT "mcp_idempotency_records_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mcp_idempotency_retention_idx" ON "mcp_idempotency_records" USING btree ("retention_expires_at");--> statement-breakpoint
CREATE INDEX "mcp_idempotency_grant_idx" ON "mcp_idempotency_records" USING btree ("grant_id");