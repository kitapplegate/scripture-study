-- Admin-made password reset links, for a member who forgot their password (no email is
-- ever sent). Mirrors invites: only a sha256 of the token is stored, a link works once,
-- and it expires.

CREATE TABLE password_resets (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  token_hash  text NOT NULL UNIQUE,            -- sha256 of the link token; the token itself is never stored
  user_id     text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_by  text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz                      -- set atomically when the new password is saved
);
CREATE INDEX password_resets_user_idx ON password_resets (user_id);
