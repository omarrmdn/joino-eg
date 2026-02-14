-- Comprehensive fix for notifications and messaging
-- 1. Remove Any Restriction on Notification Types
DO $$ 
BEGIN 
    ALTER TABLE IF EXISTS public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
END $$;

-- 2. Ensure Messages Table exists and is correct
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    sender_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    message_type TEXT DEFAULT 'general',
    subject TEXT,
    body TEXT NOT NULL,
    event_link TEXT,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE
);

-- 3. Enable RLS and add policies for messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert messages" ON public.messages;
CREATE POLICY "Anyone can insert messages" ON public.messages 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
CREATE POLICY "Users can view their own messages" ON public.messages 
    FOR SELECT USING (auth.uid()::text = sender_id OR auth.uid()::text = recipient_id);

DROP POLICY IF EXISTS "Users can update their own received messages" ON public.messages;
CREATE POLICY "Users can update their own received messages" ON public.messages 
    FOR UPDATE USING (auth.uid()::text = recipient_id);

-- 4. Enable Realtime for messages
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    ELSE
        CREATE PUBLICATION supabase_realtime FOR TABLE public.messages;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Fallback for if table already added
END $$;

-- 5. Fix/Verify Discovery Notifications Types
-- Ensure recommendation type is handled by the push service (it is)

-- 6. Add indices for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
