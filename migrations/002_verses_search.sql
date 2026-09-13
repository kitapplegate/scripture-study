-- Every verse, for full-text search (the search page and the study assistant's search
-- tool). The reader still serves text from data/scriptures/; this table is only a
-- search index, reloaded from those files by scripts/load-verses.mjs.

CREATE TABLE verses (
  id          text PRIMARY KEY,              -- "1-ne.3.7"
  volume      text NOT NULL,                 -- ot, nt, bofm, dc-testament, pgp
  book        text NOT NULL,
  chapter     smallint NOT NULL,
  verse       smallint NOT NULL,
  sort_order  integer NOT NULL,              -- canonical order, Genesis 1:1 = 0
  reference   text NOT NULL,                 -- "1 Nephi 3:7"
  text        text NOT NULL,
  tsv         tsvector GENERATED ALWAYS AS (to_tsvector('english', text)) STORED
);
CREATE INDEX verses_tsv_idx ON verses USING gin (tsv);
CREATE INDEX verses_volume_idx ON verses (volume);
