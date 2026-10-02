-- Optional state: historical matches are unchanged until explicitly edited.
ALTER TABLE matches ADD COLUMN IF NOT EXISTS analysis text;
