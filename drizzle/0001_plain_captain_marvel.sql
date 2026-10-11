ALTER TABLE "stacks" ADD COLUMN "owner_id" text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX "stacks_owner_idx" ON "stacks" USING btree ("owner_id","updated_at");