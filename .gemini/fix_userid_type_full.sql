-- This script migrates the database to support Clerk text-based User IDs instead of strict UUIDs.

-- 1. Drop existing policies that depend on the 'id' column or 'auth.uid()' (which expects UUID)
DROP POLICY IF EXISTS "Users manage own data" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Can view own user data" ON public.users;
DROP POLICY IF EXISTS "Can update own user data" ON public.users;
-- Notification policies (from previous step)
DROP POLICY IF EXISTS "Allow authenticated users to insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

-- 2. Drop Foreign Key Constraints to allow column type changes
-- We iterate through likely foreign key names. If your constraint names differ, you may need to find them in the dashboard.
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_organizer_id_fkey;
ALTER TABLE public.attendees DROP CONSTRAINT IF EXISTS attendees_user_id_fkey;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.event_questions DROP CONSTRAINT IF EXISTS event_questions_user_id_fkey;
ALTER TABLE public.event_questions DROP CONSTRAINT IF EXISTS event_questions_organizer_id_fkey;
ALTER TABLE public.event_views DROP CONSTRAINT IF EXISTS event_views_user_id_fkey;
ALTER TABLE public.user_interests DROP CONSTRAINT IF EXISTS user_interests_user_id_fkey;
ALTER TABLE public.user_sessions DROP CONSTRAINT IF EXISTS user_sessions_user_id_fkey;

-- 3. Change Column Types from UUID to TEXT
ALTER TABLE public.users ALTER COLUMN id TYPE text;
ALTER TABLE public.attendees ALTER COLUMN user_id TYPE text;
ALTER TABLE public.events ALTER COLUMN organizer_id TYPE text;
ALTER TABLE public.notifications ALTER COLUMN user_id TYPE text;
ALTER TABLE public.event_questions ALTER COLUMN user_id TYPE text;
ALTER TABLE public.event_questions ALTER COLUMN organizer_id TYPE text;
ALTER TABLE public.event_views ALTER COLUMN user_id TYPE text;
ALTER TABLE public.user_interests ALTER COLUMN user_id TYPE text;
ALTER TABLE public.user_sessions ALTER COLUMN user_id TYPE text;

-- 4. Re-add Foreign Key Constraints
ALTER TABLE public.events ADD CONSTRAINT events_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES public.users(id);
ALTER TABLE public.attendees ADD CONSTRAINT attendees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.event_questions ADD CONSTRAINT event_questions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.event_questions ADD CONSTRAINT event_questions_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES public.users(id);
ALTER TABLE public.event_views ADD CONSTRAINT event_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.user_interests ADD CONSTRAINT user_interests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.user_sessions ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

-- 5. Re-create Policies using text-based ID retrieval (auth.jwt() ->> 'sub') instead of auth.uid()

-- Users Table Policies
CREATE POLICY "Public users are viewable by everyone" ON public.users
FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.users
FOR UPDATE USING ((select auth.jwt() ->> 'sub') = id);

-- Notifications Policies (Refixed for Text IDs)
CREATE POLICY "Allow authenticated users to insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING ((select auth.jwt() ->> 'sub') = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING ((select auth.jwt() ->> 'sub') = user_id);

