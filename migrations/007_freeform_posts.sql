-- Free-form family posts (Kit, 2026-09-14): a post no longer has to start from a scripture.
-- It needs text or a scripture (or both); a link stays optional. Existing posts all have a
-- verse, so they already satisfy the new checks.

ALTER TABLE posts ALTER COLUMN verse_id DROP NOT NULL;

ALTER TABLE posts
  ADD CONSTRAINT posts_has_content CHECK (verse_id IS NOT NULL OR char_length(btrim(body)) > 0),
  ADD CONSTRAINT posts_range_needs_start CHECK (end_verse_id IS NULL OR verse_id IS NOT NULL);
