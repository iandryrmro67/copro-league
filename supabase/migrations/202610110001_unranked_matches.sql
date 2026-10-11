-- Unranked matches keep their own stats but are left out of ELO, records and cumulative stats.
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "unranked" integer NOT NULL DEFAULT 0;
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "unranked_reason" text NOT NULL DEFAULT '';
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "unranked_note" text NOT NULL DEFAULT '';
