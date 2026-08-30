CREATE TABLE "project_ai_document_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"turn_request_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"target_document_id" uuid,
	"requested_parent_id" uuid,
	"expected_draft_revision" integer,
	"base_title" text,
	"base_content" jsonb,
	"proposed_title" text,
	"proposed_content" jsonb,
	"content_hash" text,
	"applied_document_id" uuid,
	"applied_draft_revision" integer,
	"expires_at" timestamp with time zone NOT NULL,
	"decided_at" timestamp with time zone,
	"purge_after" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_ai_document_proposals_turn_unique" UNIQUE("project_id","user_id","conversation_id","turn_request_id"),
	CONSTRAINT "project_ai_document_proposals_kind_check" CHECK (
    "project_ai_document_proposals"."kind" in ('create', 'update')
  ),
	CONSTRAINT "project_ai_document_proposals_status_check" CHECK (
    "project_ai_document_proposals"."status" in ('pending', 'applied', 'rejected', 'stale', 'expired')
  ),
	CONSTRAINT "project_ai_document_proposals_payload_check" CHECK (
    (
      "project_ai_document_proposals"."status" = 'pending'
      and "project_ai_document_proposals"."proposed_title" is not null
      and "project_ai_document_proposals"."proposed_content" is not null
      and "project_ai_document_proposals"."content_hash" is not null
      and "project_ai_document_proposals"."decided_at" is null
      and "project_ai_document_proposals"."purge_after" is null
      and (
        (
          "project_ai_document_proposals"."kind" = 'create'
          and "project_ai_document_proposals"."target_document_id" is null
          and "project_ai_document_proposals"."expected_draft_revision" is null
          and "project_ai_document_proposals"."base_title" is null
          and "project_ai_document_proposals"."base_content" is null
        )
        or (
          "project_ai_document_proposals"."kind" = 'update'
          and "project_ai_document_proposals"."requested_parent_id" is null
          and "project_ai_document_proposals"."target_document_id" is not null
          and "project_ai_document_proposals"."expected_draft_revision" >= 0
          and "project_ai_document_proposals"."base_title" is not null
          and "project_ai_document_proposals"."base_content" is not null
        )
      )
    )
    or (
      "project_ai_document_proposals"."status" <> 'pending'
      and "project_ai_document_proposals"."target_document_id" is null
      and "project_ai_document_proposals"."requested_parent_id" is null
      and "project_ai_document_proposals"."expected_draft_revision" is null
      and "project_ai_document_proposals"."base_title" is null
      and "project_ai_document_proposals"."base_content" is null
      and "project_ai_document_proposals"."proposed_title" is null
      and "project_ai_document_proposals"."proposed_content" is null
      and "project_ai_document_proposals"."content_hash" is null
      and "project_ai_document_proposals"."decided_at" is not null
      and "project_ai_document_proposals"."purge_after" is not null
    )
  ),
	CONSTRAINT "project_ai_document_proposals_content_size_check" CHECK (
    ("project_ai_document_proposals"."base_content" is null or octet_length("project_ai_document_proposals"."base_content"::text) <= 65536)
    and ("project_ai_document_proposals"."proposed_content" is null or octet_length("project_ai_document_proposals"."proposed_content"::text) <= 65536)
    and ("project_ai_document_proposals"."base_title" is null or ("project_ai_document_proposals"."base_title" = btrim("project_ai_document_proposals"."base_title") and char_length("project_ai_document_proposals"."base_title") between 1 and 200))
    and ("project_ai_document_proposals"."proposed_title" is null or ("project_ai_document_proposals"."proposed_title" = btrim("project_ai_document_proposals"."proposed_title") and char_length("project_ai_document_proposals"."proposed_title") between 1 and 200))
    and ("project_ai_document_proposals"."content_hash" is null or "project_ai_document_proposals"."content_hash" ~ '^[0-9a-f]{64}$')
  ),
	CONSTRAINT "project_ai_document_proposals_receipt_check" CHECK (
    (
      "project_ai_document_proposals"."status" = 'applied'
      and "project_ai_document_proposals"."applied_document_id" is not null
      and "project_ai_document_proposals"."applied_draft_revision" >= 0
    )
    or (
      "project_ai_document_proposals"."status" <> 'applied'
      and "project_ai_document_proposals"."applied_document_id" is null
      and "project_ai_document_proposals"."applied_draft_revision" is null
    )
  ),
	CONSTRAINT "project_ai_document_proposals_time_check" CHECK (
    "project_ai_document_proposals"."expires_at" > "project_ai_document_proposals"."created_at"
    and ("project_ai_document_proposals"."purge_after" is null or "project_ai_document_proposals"."purge_after" > "project_ai_document_proposals"."decided_at")
  )
);
--> statement-breakpoint
ALTER TABLE "project_ai_document_proposals" ADD CONSTRAINT "project_ai_document_proposals_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_document_proposals" ADD CONSTRAINT "project_ai_document_proposals_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_document_proposals" ADD CONSTRAINT "project_ai_document_proposals_conversation_id_project_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."project_ai_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_ai_document_proposals_owner_status_idx" ON "project_ai_document_proposals" USING btree ("project_id","user_id","status","created_at");--> statement-breakpoint
CREATE INDEX "project_ai_document_proposals_cleanup_idx" ON "project_ai_document_proposals" USING btree ("status","expires_at","purge_after");