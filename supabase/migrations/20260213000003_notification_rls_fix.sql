-- 1. Fix Notifications Table Policies
-- Allow any authenticated user to create a notification (e.g. for another user)
DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;
CREATE POLICY "Anyone can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications" ON public.notifications
    FOR DELETE USING (user_id = auth.uid()::text);

-- 2. Fix Messages Table Policies (if table exists)
-- Ensure people can join/ask questions which involves inserting into messages
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='messages') THEN
        ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Anyone can insert messages" ON public.messages;
        CREATE POLICY "Anyone can insert messages" ON public.messages 
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- 3. Fix Push Tokens Policies
DROP POLICY IF EXISTS "Users can manage their own tokens" ON public.expo_push_tokens;
CREATE POLICY "Users can manage their own tokens" ON public.expo_push_tokens
    FOR ALL USING (user_id = auth.uid()::text OR auth.uid() IS NULL);

-- 4. Enable Realtime for notifications
-- This is CRITICAL for the NotificationProvider to show local banners in foreground
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
-- Check if publication exists and add table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Publication might not exist yet or table already added
END $$;

-- 5. Enable extension for webhooks
CREATE EXTENSION IF NOT EXISTS pg_net;

-- NOTE TO USER: 
-- 1. STANDALONE BUILDS: For Android push notifications to work in 'eas build', 
--    you MUST have a 'google-services.json' file and it must be referenced in app.json.
-- 2. SUPABASE SECRETS: Ensure you have set the 'SUPABASE_SERVICE_ROLE_KEY' secret 
--    for your Edge Functions: `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_key`
-- 3. WEBHOOKS: Set up a Database Webhook in the Dashboard to trigger 'push-notifications' 
--    on INSERTs to the 'notifications' table.
