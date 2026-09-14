-- Talk builder capsules (SPEC D10): scripture, thought, section heading, link, kept in
-- the order the owner arranged them. talks.body (the old markdown editor) is no longer
-- used; it's left in place rather than dropped.

CREATE TABLE talk_items (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  talk_id       bigint NOT NULL REFERENCES talks(id) ON DELETE CASCADE,
  position      integer NOT NULL,
  kind          text NOT NULL CHECK (kind IN ('scripture', 'thought', 'heading', 'link')),
  verse_id      text,                          -- scripture: "moro.10.4"
  end_verse_id  text,                          -- scripture range end: "moro.10.5"
  body          text NOT NULL DEFAULT '' CHECK (char_length(body) <= 10000),  -- thought/heading text, scripture note, link label
  url           text CHECK (url IS NULL OR (url ~* '^https://' AND char_length(url) <= 500)),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (kind <> 'scripture' OR verse_id IS NOT NULL),
  CHECK (kind <> 'link' OR url IS NOT NULL)
);
CREATE INDEX talk_items_talk_idx ON talk_items (talk_id, position, id);
