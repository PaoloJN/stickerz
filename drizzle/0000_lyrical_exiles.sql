CREATE TABLE "stacks" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"author" text NOT NULL,
	"model" text NOT NULL,
	"color" text NOT NULL,
	"layout" jsonb NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL,
	"sticker_count" integer DEFAULT 0 NOT NULL,
	"remix_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "stacks_gallery_idx" ON "stacks" USING btree ("visibility","created_at");