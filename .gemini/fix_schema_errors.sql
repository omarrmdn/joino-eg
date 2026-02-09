-- Fix notifications type check constraint
-- First, find the current constraint name (it's likely notifications_type_check)
-- and add the missing types. 
-- For safety, we drop and recreate the constraint with all required types.

ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'new_attendee', 
  'attendee_cancel', 
  'reminder_12hr', 
  'reminder_2hr', 
  'event_access', 
  'question', 
  'new_event', 
  'event_stats'
));

-- Fix missing power_score column in user_sessions
-- Based on error: column "power_score" does not exist
ALTER TABLE public.user_sessions 
ADD COLUMN IF NOT EXISTS power_score INTEGER DEFAULT 0;

-- Optional: If there's a trigger on user_sessions that was failing, 
-- adding the column should resolve it.
