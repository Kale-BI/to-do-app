ALTER TABLE "todo" RENAME TO "block";--> statement-breakpoint
ALTER TABLE "block" RENAME COLUMN "title" TO "text";--> statement-breakpoint
ALTER TABLE "block" RENAME CONSTRAINT "todo_list_id_list_id_fk" TO "block_list_id_list_id_fk";--> statement-breakpoint
ALTER TABLE "block" ADD COLUMN "kind" text DEFAULT 'todo' NOT NULL;--> statement-breakpoint
ALTER TABLE "block" ADD COLUMN "position" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "block" SET "position" = sub.rn FROM (SELECT "id", ROW_NUMBER() OVER (PARTITION BY "list_id" ORDER BY "created_at", "id") AS rn FROM "block") sub WHERE "block"."id" = sub."id";
