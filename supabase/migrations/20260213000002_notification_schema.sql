-- Ensure notifications table exists and has necessary columns
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE -- Track when push was sent
);

-- Ensure expo_push_tokens table exists
CREATE TABLE IF NOT EXISTS public.expo_push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    device_name TEXT,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add sent_at if it doesn't exist (safety check for existing table)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='sent_at') THEN
        ALTER TABLE public.notifications ADD COLUMN sent_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expo_push_tokens ENABLE ROW LEVEL SECURITY;

-- Simple policies (Allow service role to do everything, allow users to see/edit their own)
-- Note: Clerk user IDs are strings (TEXT)
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "Users can manage their own tokens" ON public.expo_push_tokens
    FOR ALL USING (user_id = auth.uid()::text);
