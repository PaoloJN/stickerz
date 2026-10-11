CREATE TABLE "brand_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"mode" text NOT NULL,
	"company" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"logos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"plan" text,
	"details" text,
	"authorized" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
