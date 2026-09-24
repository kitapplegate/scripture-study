-- One row per browser/device that a member has opted in for. The endpoint is a
-- capability URL supplied by the browser's push service, so it stays server-side.

CREATE TABLE push_subscriptions (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  endpoint    text NOT NULL UNIQUE CHECK (char_length(endpoint) <= 2048),
  p256dh      text NOT NULL CHECK (char_length(p256dh) <= 512),
  auth        text NOT NULL CHECK (char_length(auth) <= 512),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX push_subscriptions_user_idx ON push_subscriptions (user_id);
