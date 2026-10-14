CREATE TABLE "league_members" (
	"week_key" text NOT NULL,
	"group_number" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "league_members_week_key_user_id_pk" PRIMARY KEY("week_key","user_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pseudo" text;--> statement-breakpoint
ALTER TABLE "league_members" ADD CONSTRAINT "league_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "league_members_group" ON "league_members" USING btree ("week_key","group_number");