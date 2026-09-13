-- Talk/lesson drafts (the talk builder) and a per-user daily cap on study assistant
-- requests, so one account can't burn through the free model quota.

CREATE TABLE talks (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_id    text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  title       text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  kind        text NOT NULL DEFAULT 'talk' CHECK (kind IN ('talk', 'lesson')),
  minutes     smallint CHECK (minutes BETWEEN 1 AND 120),
  audience    text CHECK (char_length(audience) <= 200),
  body        text NOT NULL DEFAULT '' CHECK (char_length(body) <= 50000),  -- markdown with [[Alma 32:21]] citations
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX talks_owner_idx ON talks (owner_id, updated_at DESC);

CREATE TABLE assistant_usage (
  user_id   text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  day       date NOT NULL,
  requests  integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
