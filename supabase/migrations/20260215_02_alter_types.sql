-- STEP 2: ALTER COLUMN TYPES
-- Run this AFTER Step 1.
-- This changes the ID columns from UUID to TEXT to support Clerk IDs ("user_...").

-- 1. Change the main Users table first
ALTER TABLE IF EXISTS users ALTER COLUMN id TYPE text USING id::text;

-- 2. Change all the child tables that reference users
ALTER TABLE IF EXISTS messages ALTER COLUMN sender_id TYPE text USING sender_id::text;
ALTER TABLE IF EXISTS messages ALTER COLUMN recipient_id TYPE text USING recipient_id::text;

ALTER TABLE IF EXISTS event_questions ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE IF EXISTS event_questions ALTER COLUMN organizer_id TYPE text USING organizer_id::text;

ALTER TABLE IF EXISTS events ALTER COLUMN organizer_id TYPE text USING organizer_id::text;

ALTER TABLE IF EXISTS attendees ALTER COLUMN user_id TYPE text USING user_id::text;

ALTER TABLE IF EXISTS notifications ALTER COLUMN user_id TYPE text USING user_id::text;

ALTER TABLE IF EXISTS notification_preferences ALTER COLUMN user_id TYPE text USING user_id::text;

ALTER TABLE IF EXISTS expo_push_tokens ALTER COLUMN user_id TYPE text USING user_id::text;
