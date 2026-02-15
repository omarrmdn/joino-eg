-- COMPLETE MIGRATION SCRIPT V3 (Dynamic Policy Cleanup)
-- This script will dynamically find and drop ALL policies on the 'users' table
-- to ensure nothing locks the table or blocks the column type change.

BEGIN;

-- ==========================================
-- 1. DROP CONSTRAINTS (Foreign Keys)
-- ==========================================
ALTER TABLE IF EXISTS messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE IF EXISTS messages DROP CONSTRAINT IF EXISTS messages_recipient_id_fkey;
ALTER TABLE IF EXISTS event_questions DROP CONSTRAINT IF EXISTS event_questions_user_id_fkey;
ALTER TABLE IF EXISTS event_questions DROP CONSTRAINT IF EXISTS event_questions_organizer_id_fkey;
ALTER TABLE IF EXISTS events DROP CONSTRAINT IF EXISTS events_organizer_id_fkey;
ALTER TABLE IF EXISTS attendees DROP CONSTRAINT IF EXISTS attendees_user_id_fkey;
ALTER TABLE IF EXISTS notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE IF EXISTS notification_preferences DROP CONSTRAINT IF EXISTS notification_preferences_user_id_fkey;
ALTER TABLE IF EXISTS expo_push_tokens DROP CONSTRAINT IF EXISTS expo_push_tokens_user_id_fkey;

-- ==========================================
-- 2. DROP ALL POLICIES ON 'USERS' TABLE
-- ==========================================
-- We use a dynamic anonymous block to drop all policies on 'users'
-- regardless of their specific names. This handles 'users_update_own' and any others.
DO $$ 
DECLARE 
    r RECORD; 
BEGIN 
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users') LOOP 
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON users'; 
    END LOOP; 
END $$;


-- ==========================================
-- 3. ALTER COLUMN TYPES TO TEXT
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
-- 4. RECREATE POLICIES (Updated for Clerk IDs)
-- ==========================================

-- Recreate standard policies with text-compatible check
-- using (auth.jwt() ->> 'sub') ensures we get the Clerk ID string safely

-- 4.1 Insert Own Profile
CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (
  (select auth.jwt() ->> 'sub') = id
);

-- 4.2 Read All (Public Profiles)
CREATE POLICY "Enable read access for all users" ON users FOR SELECT USING (true);

-- 4.3 Update Own Profile
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (
  (select auth.jwt() ->> 'sub') = id
);

-- 4.4 Delete Own (Optional but good practice)
CREATE POLICY "users_delete_own" ON users FOR DELETE USING (
  (select auth.jwt() ->> 'sub') = id
);


-- ==========================================
-- 5. RESTORE CONSTRAINTS
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
