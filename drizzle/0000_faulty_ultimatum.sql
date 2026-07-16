CREATE TYPE "public"."room_status" AS ENUM('waiting', 'in_progress', 'round_ended');--> statement-breakpoint
CREATE TYPE "public"."round_status" AS ENUM('setup', 'active', 'finished');--> statement-breakpoint
CREATE TABLE "player_boards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"round_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"grid" jsonb NOT NULL,
	"marked" jsonb DEFAULT '[]' NOT NULL,
	"swept_lines" jsonb DEFAULT '[]' NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"confirmed" boolean DEFAULT false NOT NULL,
	"confirmed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"join_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"host_id" uuid NOT NULL,
	"max_players" integer DEFAULT 5 NOT NULL,
	"status" "room_status" DEFAULT 'waiting' NOT NULL,
	"win_word" text DEFAULT 'BINGO' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rooms_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"round_number" integer DEFAULT 1 NOT NULL,
	"status" "round_status" DEFAULT 'setup' NOT NULL,
	"current_turn_player_id" uuid,
	"last_called_number" integer,
	"turn_started_at" timestamp,
	"setup_deadline" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "player_boards" ADD CONSTRAINT "player_boards_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_boards" ADD CONSTRAINT "player_boards_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "player_boards_round_id_idx" ON "player_boards" USING btree ("round_id");--> statement-breakpoint
CREATE INDEX "player_boards_player_id_idx" ON "player_boards" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "players_room_id_idx" ON "players" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "rooms_code_idx" ON "rooms" USING btree ("code");--> statement-breakpoint
CREATE INDEX "rounds_room_id_idx" ON "rounds" USING btree ("room_id");