-- Migration to change user IDs from UUID to TEXT to support Clerk IDs

BEGIN;

-- 1. Drop constraints (to allow type change)
ALTER TABLE IF EXISTS messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE IF EXISTS messages DROP CONSTRAINT IF EXISTS messages_recipient_id_fkey;
ALTER TABLE IF EXISTS event_questions DROP CONSTRAINT IF EXISTS event_questions_user_id_fkey;
ALTER TABLE IF EXISTS event_questions DROP CONSTRAINT IF EXISTS event_questions_organizer_id_fkey;
ALTER TABLE IF EXISTS events DROP CONSTRAINT IF EXISTS events_organizer_id_fkey;
ALTER TABLE IF EXISTS attendees DROP CONSTRAINT IF EXISTS attendees_user_id_fkey;
ALTER TABLE IF EXISTS notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE IF EXISTS notification_preferences DROP CONSTRAINT IF EXISTS notification_preferences_user_id_fkey;
ALTER TABLE IF EXISTS expo_push_tokens DROP CONSTRAINT IF EXISTS expo_push_tokens_user_id_fkey;

-- 2. Change column types to TEXT
-- users table (Reference)
ALTER TABLE IF EXISTS users ALTER COLUMN id TYPE text USING id::text;

-- Dependent tables
ALTER TABLE IF EXISTS messages ALTER COLUMN sender_id TYPE text USING sender_id::text;
ALTER TABLE IF EXISTS messages ALTER COLUMN recipient_id TYPE text USING recipient_id::text;

ALTER TABLE IF EXISTS event_questions ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE IF EXISTS event_questions ALTER COLUMN organizer_id TYPE text USING organizer_id::text;

ALTER TABLE IF EXISTS events ALTER COLUMN organizer_id TYPE text USING organizer_id::text;

ALTER TABLE IF EXISTS attendees ALTER COLUMN user_id TYPE text USING user_id::text;

ALTER TABLE IF EXISTS notifications ALTER COLUMN user_id TYPE text USING user_id::text;

ALTER TABLE IF EXISTS notification_preferences ALTER COLUMN user_id TYPE text USING user_id::text;

ALTER TABLE IF EXISTS expo_push_tokens ALTER COLUMN user_id TYPE text USING user_id::text;

-- 3. Re-add constraints (Only if tables exist - this part is tricky in pure SQL block if tables are missing)
-- But typically these tables MUST exist for the app to work. 
-- We will wrap in DO block to be safer? No, standard SQL is fine if we assume schema exists.
-- If a table doesn't exist, we can't add a constraint to it anyway.
-- To be robust, we'd need dynamic SQL, but that's overkill. 
-- I'll keep the standard ADD CONSTRAINT. If table doesn't exist, previous ALTER would verify existence (or lack thereof).
-- Actually, ALTER TABLE IF EXISTS ... ADD CONSTRAINT works?
-- Postgres Syntax: ALTER TABLE [ IF EXISTS ] name action [, ... ]
-- So yes, `ALTER TABLE IF EXISTS messages ADD CONSTRAINT ...` valid.

ALTER TABLE IF EXISTS messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS messages ADD CONSTRAINT messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS event_questions ADD CONSTRAINT event_questions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS event_questions ADD CONSTRAINT event_questions_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS events ADD CONSTRAINT events_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS attendees ADD CONSTRAINT attendees_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS notification_preferences ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS expo_push_tokens ADD CONSTRAINT expo_push_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

COMMIT;
