-- Reactions on comments (Kit, 2026-09-14): the same three as posts (heart, pray, insight),
-- one of each kind per member per comment. They go away with the comment or the member.

CREATE TABLE comment_reactions (
  comment_id  bigint NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id     text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('heart', 'pray', 'insight')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id, kind)
);
