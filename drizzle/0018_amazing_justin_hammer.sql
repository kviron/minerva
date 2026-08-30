CREATE TABLE "project_ai_conversation_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"citations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"turn_request_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_ai_conversation_messages_role_check" CHECK (
    "project_ai_conversation_messages"."role" in ('user', 'assistant')
  ),
	CONSTRAINT "project_ai_conversation_messages_content_check" CHECK (
    char_length("project_ai_conversation_messages"."content") between 1 and 12000
  ),
	CONSTRAINT "project_ai_conversation_messages_citations_check" CHECK (
    jsonb_typeof("project_ai_conversation_messages"."citations") = 'array'
  )
);
--> statement-breakpoint
CREATE TABLE "project_ai_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"purge_after" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_ai_conversations_title_check" CHECK (
    "project_ai_conversations"."title" = btrim("project_ai_conversations"."title")
    and char_length("project_ai_conversations"."title") between 1 and 120
  ),
	CONSTRAINT "project_ai_conversations_deletion_pair_check" CHECK (
    ("project_ai_conversations"."deleted_at" is null and "project_ai_conversations"."purge_after" is null)
    or ("project_ai_conversations"."deleted_at" is not null and "project_ai_conversations"."purge_after" is not null)
  )
);
--> statement-breakpoint
ALTER TABLE "project_ai_conversation_messages" ADD CONSTRAINT "project_ai_conversation_messages_conversation_id_project_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."project_ai_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_conversations" ADD CONSTRAINT "project_ai_conversations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_conversations" ADD CONSTRAINT "project_ai_conversations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_ai_conversation_messages_turn_role_unique" ON "project_ai_conversation_messages" USING btree ("conversation_id","turn_request_id","role");--> statement-breakpoint
CREATE INDEX "project_ai_conversation_messages_conversation_created_idx" ON "project_ai_conversation_messages" USING btree ("conversation_id","created_at","id");--> statement-breakpoint
CREATE INDEX "project_ai_conversations_owner_active_idx" ON "project_ai_conversations" USING btree ("project_id","user_id","deleted_at","updated_at");--> statement-breakpoint
CREATE INDEX "project_ai_conversations_cleanup_idx" ON "project_ai_conversations" USING btree ("purge_after","expires_at");