-- better-auth creates "user".role as NOT NULL with no database default (its default
-- lives in app config). Make the safe value the database default too, so any insert
-- path that forgets the role gets 'member', never an error or an admin.
ALTER TABLE "user" ALTER COLUMN role SET DEFAULT 'member';
ALTER TABLE "user" ADD CONSTRAINT user_role_valid CHECK (role IN ('member', 'admin'));
