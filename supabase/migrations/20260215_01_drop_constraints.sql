-- STEP 1: DROP CONSTRAINTS
-- Run this first to remove foreign key dependencies.
-- This allows us to change the column types without Postgres complaining.

ALTER TABLE IF EXISTS messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE IF EXISTS messages DROP CONSTRAINT IF EXISTS messages_recipient_id_fkey;

ALTER TABLE IF EXISTS event_questions DROP CONSTRAINT IF EXISTS event_questions_user_id_fkey;
ALTER TABLE IF EXISTS event_questions DROP CONSTRAINT IF EXISTS event_questions_organizer_id_fkey;

ALTER TABLE IF EXISTS events DROP CONSTRAINT IF EXISTS events_organizer_id_fkey;

ALTER TABLE IF EXISTS attendees DROP CONSTRAINT IF EXISTS attendees_user_id_fkey;

ALTER TABLE IF EXISTS notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

ALTER TABLE IF EXISTS notification_preferences DROP CONSTRAINT IF EXISTS notification_preferences_user_id_fkey;

ALTER TABLE IF EXISTS expo_push_tokens DROP CONSTRAINT IF EXISTS expo_push_tokens_user_id_fkey;
