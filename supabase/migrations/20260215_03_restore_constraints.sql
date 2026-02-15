-- STEP 3: RESTORE CONSTRAINTS
-- Run this LAST (after Step 2).
-- This re-enables the foreign key relationships to ensure data integrity.

ALTER TABLE IF EXISTS messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS messages ADD CONSTRAINT messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS event_questions ADD CONSTRAINT event_questions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS event_questions ADD CONSTRAINT event_questions_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS events ADD CONSTRAINT events_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS attendees ADD CONSTRAINT attendees_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS notification_preferences ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS expo_push_tokens ADD CONSTRAINT expo_push_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
