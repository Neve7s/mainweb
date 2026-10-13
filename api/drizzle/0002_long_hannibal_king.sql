CREATE TABLE "allowed_emails" (
	"email" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now()
);
