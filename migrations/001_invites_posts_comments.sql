-- App tables. The auth tables ("user", "session", "account", "verification") are
-- created first by better-auth's own migrate step; these reference "user".

CREATE TABLE invites (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  token_hash  text NOT NULL UNIQUE,            -- sha256 of the link token; the token itself is never stored
  role        text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  note        text,                            -- who it's for, e.g. "Mom"
  created_by  text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  claimed_at  timestamptz,                     -- set atomically when a sign-up starts using it
  used_by     text REFERENCES "user"(id) ON DELETE SET NULL
);

CREATE TABLE posts (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  author_id     text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  verse_id      text NOT NULL,                 -- "1-ne.3.7"
  end_verse_id  text,                          -- set when sharing a range
  body          text NOT NULL DEFAULT '' CHECK (char_length(body) <= 5000),
  link_url      text CHECK (link_url IS NULL OR (link_url ~ '^https://' AND char_length(link_url) <= 500)),
  created_at    timestamptz NOT NULL DEFAULT now(),
  edited_at     timestamptz
);
CREATE INDEX posts_created_idx ON posts (created_at DESC, id DESC);
CREATE INDEX posts_author_idx ON posts (author_id);

CREATE TABLE post_reactions (
  post_id     bigint NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('heart', 'pray', 'insight')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id, kind)
);

CREATE TABLE comments (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id     bigint NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id   text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  body        text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX comments_post_idx ON comments (post_id, created_at);
