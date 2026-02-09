-- Change user_id column type to text for users table
ALTER TABLE public.users ALTER COLUMN id TYPE text;

-- Change user_id column type to text for attendees table
ALTER TABLE public.attendees ALTER COLUMN user_id TYPE text;

-- Change organizer_id column type to text for events table
ALTER TABLE public.events ALTER COLUMN organizer_id TYPE text;

-- Change user_id column type to text for notifications table
ALTER TABLE public.notifications ALTER COLUMN user_id TYPE text;

-- Change user_id column type to text for event_questions table
ALTER TABLE public.event_questions ALTER COLUMN user_id TYPE text;

-- Change organizer_id column type to text for event_questions table
ALTER TABLE public.event_questions ALTER COLUMN organizer_id TYPE text;

-- Change user_id column type to text for event_views table
ALTER TABLE public.event_views ALTER COLUMN user_id TYPE text;

-- Change user_id column type to text for user_interests table
ALTER TABLE public.user_interests ALTER COLUMN user_id TYPE text;

-- Change user_id column type to text for user_sessions table
ALTER TABLE public.user_sessions ALTER COLUMN user_id TYPE text;
