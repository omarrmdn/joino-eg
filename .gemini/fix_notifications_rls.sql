-- Enable RLS on the notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to insert notifications (e.g., for other users)
-- This allows any authenticated user to create a notification for anyone.
CREATE POLICY "Allow authenticated users to insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy to allow users to view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id::text);

-- Policy to allow users to update their own notifications (e.g. mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid()::text = user_id::text);
