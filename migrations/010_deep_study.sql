-- Deep Study passages (SPEC → Deep Study, D10), for full-text search only. Kept apart
-- from `verses` on purpose: the study assistant and the main search never read this
-- table. Reloaded from data/deep-study/ by scripts/load-deep-study.mjs.

CREATE TABLE ds_passages (
  id          text PRIMARY KEY,              -- "jos-ant.7.13.1"
  source      text NOT NULL,                 -- "jos-ant"
  book        text NOT NULL,                 -- "7", or "pref"
  chapter     smallint NOT NULL,
  section     smallint NOT NULL,
  sort_order  integer NOT NULL,              -- reading order within the source
  reference   text NOT NULL,                 -- "Antiquities 7.13.1"
  text        text NOT NULL,
  tsv         tsvector GENERATED ALWAYS AS (to_tsvector('english', text)) STORED
);
CREATE INDEX ds_passages_tsv_idx ON ds_passages USING gin (tsv);
CREATE INDEX ds_passages_source_idx ON ds_passages (source);
