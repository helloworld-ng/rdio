CREATE TABLE "host" (
	"name" text PRIMARY KEY NOT NULL,
	"color_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"host" text NOT NULL
);
