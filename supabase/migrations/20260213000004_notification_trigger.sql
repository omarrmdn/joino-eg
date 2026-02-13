-- Final step to make notifications permanent
-- This trigger ensures that EVERY time a row is inserted into 'notifications',
-- the 'push-notifications' edge function is called automatically.

CREATE OR REPLACE FUNCTION public.handle_new_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the edge function using pg_net (asynchronously)
  -- The function code handles getting tokens and sending to Expo
  PERFORM
    net.http_post(
      url := 'https://icuvaldfjqmyirzmcjst.supabase.co/functions/v1/push-notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('record', row_to_json(NEW))
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_notification_created ON public.notifications;
CREATE TRIGGER on_notification_created
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_notification();
