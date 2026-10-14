ALTER TABLE "users" ADD COLUMN "recovery_key" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_recovery_key_unique" UNIQUE("recovery_key");