CREATE TABLE "project_ai_turn_controls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"rate_window_started_at" timestamp with time zone NOT NULL,
	"rate_count" integer DEFAULT 0 NOT NULL,
	"lease_token" uuid,
	"lease_expires_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_ai_turn_controls_project_user_unique" UNIQUE("project_id","user_id"),
	CONSTRAINT "project_ai_turn_controls_rate_count_check" CHECK ("project_ai_turn_controls"."rate_count" >= 0),
	CONSTRAINT "project_ai_turn_controls_lease_pair_check" CHECK (
    ("project_ai_turn_controls"."lease_token" is null and "project_ai_turn_controls"."lease_expires_at" is null)
    or ("project_ai_turn_controls"."lease_token" is not null and "project_ai_turn_controls"."lease_expires_at" is not null)
  )
);
--> statement-breakpoint
CREATE TABLE "project_ai_usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"connection_id" uuid,
	"request_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"duration_ms" integer NOT NULL,
	"outcome" text NOT NULL,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_ai_usage_events_request_id_unique" UNIQUE("request_id"),
	CONSTRAINT "project_ai_usage_events_provider_check" CHECK ("project_ai_usage_events"."provider" in ('openai')),
	CONSTRAINT "project_ai_usage_events_outcome_check" CHECK ("project_ai_usage_events"."outcome" in ('completed', 'failed', 'cancelled', 'denied')),
	CONSTRAINT "project_ai_usage_events_model_check" CHECK (
    "project_ai_usage_events"."model" = btrim("project_ai_usage_events"."model")
    and char_length("project_ai_usage_events"."model") between 1 and 100
  ),
	CONSTRAINT "project_ai_usage_events_numbers_check" CHECK (
    ("project_ai_usage_events"."input_tokens" is null or "project_ai_usage_events"."input_tokens" >= 0)
    and ("project_ai_usage_events"."output_tokens" is null or "project_ai_usage_events"."output_tokens" >= 0)
    and "project_ai_usage_events"."duration_ms" >= 0
  ),
	CONSTRAINT "project_ai_usage_events_error_code_check" CHECK (
    "project_ai_usage_events"."error_code" is null
    or (
      "project_ai_usage_events"."error_code" = btrim("project_ai_usage_events"."error_code")
      and char_length("project_ai_usage_events"."error_code") between 1 and 100
    )
  )
);
--> statement-breakpoint
ALTER TABLE "project_ai_turn_controls" ADD CONSTRAINT "project_ai_turn_controls_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_turn_controls" ADD CONSTRAINT "project_ai_turn_controls_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_usage_events" ADD CONSTRAINT "project_ai_usage_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_usage_events" ADD CONSTRAINT "project_ai_usage_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_usage_events" ADD CONSTRAINT "project_ai_usage_events_connection_id_project_ai_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."project_ai_connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_ai_turn_controls_lease_expires_at_idx" ON "project_ai_turn_controls" USING btree ("lease_expires_at");--> statement-breakpoint
CREATE INDEX "project_ai_usage_events_project_created_at_idx" ON "project_ai_usage_events" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "project_ai_usage_events_user_created_at_idx" ON "project_ai_usage_events" USING btree ("user_id","created_at");