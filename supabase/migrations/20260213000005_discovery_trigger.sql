-- Trigger to call discovery-notifications edge function when a new event is created
CREATE OR REPLACE FUNCTION public.handle_new_event_discovery()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the discovery edge function
  -- This function will find nearby users and users with matching interests
  PERFORM
    net.http_post(
      url := 'https://icuvaldfjqmyirzmcjst.supabase.co/functions/v1/discovery-notifications',
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
DROP TRIGGER IF EXISTS on_event_created_discovery ON public.events;
CREATE TRIGGER on_event_created_discovery
  AFTER INSERT ON public.events
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION public.handle_new_event_discovery();
