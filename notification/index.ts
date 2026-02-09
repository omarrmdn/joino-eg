// supabase/functions/send-push-notifications/index.ts
// This is a Supabase Edge Function that sends push notifications via Expo

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, any>;
  read: boolean;
  created_at: string;
  sent_at: string | null;
}

interface PushMessage {
  to: string;
  sound: string;
  title: string;
  body: string;
  data: Record<string, any>;
  badge?: number;
  priority: string;
}

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get recent unsent notifications
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .is('sent_at', null)
      .order('created_at', { ascending: true })
      .limit(100);

    if (notifError) throw notifError;

    if (!notifications || notifications.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No notifications to send' }),
        { status: 200 }
      );
    }

    const messages: PushMessage[] = [];
    const notificationIds: string[] = [];

    // Build push messages
    for (const notification of notifications as Notification[]) {
      // Get user's push tokens
      const { data: tokens, error: tokenError } = await supabase
        .from('expo_push_tokens')
        .select('token')
        .eq('user_id', notification.user_id);

      if (tokenError || !tokens || tokens.length === 0) continue;

      // Check user preferences
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('push_enabled, ' + notification.type)
        .eq('user_id', notification.user_id)
        .single();

      // Skip if push disabled or this notification type disabled
      if (!prefs || !prefs.push_enabled || prefs[notification.type] === false) {
        // Mark as sent even though we skipped it
        notificationIds.push(notification.id);
        continue;
      }

      // Get unread count for badge
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', notification.user_id)
        .eq('read', false);

      // Create push message for each token
      for (const tokenData of tokens) {
        messages.push({
          to: tokenData.token,
          sound: 'default',
          title: notification.title,
          body: notification.body,
          data: notification.data,
          badge: count || 0,
          priority: 'high',
        });
      }

      notificationIds.push(notification.id);
    }

    // Send push notifications in batches
    if (messages.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        
        const response = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(batch),
        });

        if (!response.ok) {
          console.error('Expo push error:', await response.text());
        }
      }
    }

    // Mark notifications as sent
    if (notificationIds.length > 0) {
      await supabase
        .from('notifications')
        .update({ sent_at: new Date().toISOString() })
        .in('id', notificationIds);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: messages.length,
        processed: notifications.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
