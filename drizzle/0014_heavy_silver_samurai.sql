CREATE TABLE "project_ai_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"api_key_ciphertext" text NOT NULL,
	"api_key_nonce" text NOT NULL,
	"api_key_key_version" integer NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'unverified' NOT NULL,
	"system_instructions" text,
	"max_output_tokens" integer DEFAULT 2048 NOT NULL,
	"request_timeout_ms" integer DEFAULT 30000 NOT NULL,
	"last_validated_at" timestamp with time zone,
	"created_by_user_id" uuid NOT NULL,
	"updated_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_ai_connections_project_id_unique" UNIQUE("project_id"),
	CONSTRAINT "project_ai_connections_provider_check" CHECK ("project_ai_connections"."provider" in ('openai')),
	CONSTRAINT "project_ai_connections_status_check" CHECK ("project_ai_connections"."status" in ('unverified', 'valid', 'invalid')),
	CONSTRAINT "project_ai_connections_model_check" CHECK (
    "project_ai_connections"."model" = btrim("project_ai_connections"."model")
    and char_length("project_ai_connections"."model") between 1 and 100
  ),
	CONSTRAINT "project_ai_connections_api_key_envelope_check" CHECK (
    char_length("project_ai_connections"."api_key_ciphertext") > 0
    and char_length("project_ai_connections"."api_key_nonce") > 0
    and "project_ai_connections"."api_key_key_version" > 0
  ),
	CONSTRAINT "project_ai_connections_system_instructions_check" CHECK (
    "project_ai_connections"."system_instructions" is null
    or (
      "project_ai_connections"."system_instructions" = btrim("project_ai_connections"."system_instructions")
      and char_length("project_ai_connections"."system_instructions") between 1 and 4000
    )
  ),
	CONSTRAINT "project_ai_connections_limits_check" CHECK (
    "project_ai_connections"."max_output_tokens" between 128 and 8192
    and "project_ai_connections"."request_timeout_ms" between 5000 and 120000
  )
);
--> statement-breakpoint
ALTER TABLE "project_ai_connections" ADD CONSTRAINT "project_ai_connections_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_connections" ADD CONSTRAINT "project_ai_connections_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_connections" ADD CONSTRAINT "project_ai_connections_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_ai_connections_status_idx" ON "project_ai_connections" USING btree ("status");--> statement-breakpoint
CREATE INDEX "project_ai_connections_updated_by_user_id_idx" ON "project_ai_connections" USING btree ("updated_by_user_id");