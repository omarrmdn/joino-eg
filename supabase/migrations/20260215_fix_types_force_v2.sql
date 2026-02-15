-- COMPLETE MIGRATION SCRIPT V2 (Handling Policies)
-- This script replaces the previous ones. run this entire block at once.

BEGIN;

-- ==========================================
-- 1. DROP DEPENDENCIES
-- ==========================================

-- Drop Foreign Key Constraints (Must be done first)
ALTER TABLE IF EXISTS messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE IF EXISTS messages DROP CONSTRAINT IF EXISTS messages_recipient_id_fkey;
ALTER TABLE IF EXISTS event_questions DROP CONSTRAINT IF EXISTS event_questions_user_id_fkey;
ALTER TABLE IF EXISTS event_questions DROP CONSTRAINT IF EXISTS event_questions_organizer_id_fkey;
ALTER TABLE IF EXISTS events DROP CONSTRAINT IF EXISTS events_organizer_id_fkey;
ALTER TABLE IF EXISTS attendees DROP CONSTRAINT IF EXISTS attendees_user_id_fkey;
ALTER TABLE IF EXISTS notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE IF EXISTS notification_preferences DROP CONSTRAINT IF EXISTS notification_preferences_user_id_fkey;
ALTER TABLE IF EXISTS expo_push_tokens DROP CONSTRAINT IF EXISTS expo_push_tokens_user_id_fkey;

-- Drop Policies that depend on the 'id' column
-- We need to drop these to change the column type. We will recreate them later.
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable update for users based on email" ON users;
DROP POLICY IF EXISTS "Can update own user data" ON users;
DROP POLICY IF EXISTS "Can view their own user data" ON users;


-- ==========================================
-- 2. ALTER COLUMN TYPES TO TEXT
-- ==========================================

-- Change the main Users table
ALTER TABLE IF EXISTS users ALTER COLUMN id TYPE text USING id::text;

-- Change dependent tables
ALTER TABLE IF EXISTS messages ALTER COLUMN sender_id TYPE text USING sender_id::text;
ALTER TABLE IF EXISTS messages ALTER COLUMN recipient_id TYPE text USING recipient_id::text;

ALTER TABLE IF EXISTS event_questions ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE IF EXISTS event_questions ALTER COLUMN organizer_id TYPE text USING organizer_id::text;

ALTER TABLE IF EXISTS events ALTER COLUMN organizer_id TYPE text USING organizer_id::text;

ALTER TABLE IF EXISTS attendees ALTER COLUMN user_id TYPE text USING user_id::text;

ALTER TABLE IF EXISTS notifications ALTER COLUMN user_id TYPE text USING user_id::text;

ALTER TABLE IF EXISTS notification_preferences ALTER COLUMN user_id TYPE text USING user_id::text;

ALTER TABLE IF EXISTS expo_push_tokens ALTER COLUMN user_id TYPE text USING user_id::text;


-- ==========================================
-- 3. RECREATE POLICIES (Updated for Clerk IDs)
-- ==========================================

-- Recreate "users_insert_own" with text-compatible check
-- using (auth.jwt() ->> 'sub') ensures we get the Clerk ID string safely
CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (
  (select auth.jwt() ->> 'sub') = id
);

-- Allow public read access (Common pattern)
CREATE POLICY "Enable read access for all users" ON users FOR SELECT USING (true);

-- Allow users to update their own profile
CREATE POLICY "Can update own user data" ON users FOR UPDATE USING (
  (select auth.jwt() ->> 'sub') = id
);


-- ==========================================
-- 4. RESTORE CONSTRAINTS
-- ==========================================

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
