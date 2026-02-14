// @ts-ignore: Deno HTTPS imports are valid in Supabase Edge Functions
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-ignore: Deno HTTPS imports are valid in Supabase Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

serve(async (req: Request) => {
    try {
        // @ts-ignore: Deno is available in Supabase Edge Functions environment
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        // @ts-ignore: Deno is available in Supabase Edge Functions environment
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseKey) {
            console.error('[Push] Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
            return new Response(JSON.stringify({ error: 'Config error' }), { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get the notification data from the webhook payload
        const payload = await req.json();
        const notification = payload.record;

        if (!notification || !notification.user_id) {
            return new Response(JSON.stringify({ error: 'No notification record found' }), { status: 400 });
        }

        console.log(`Processing notification ${notification.id} for user ${notification.user_id}`);

        // 0. Check if this notification should auto-create a message in the Inbox
        // This handles cases where RLS prevents client-side creation (e.g. system messages)
        if (notification.data && notification.data.create_message) {
            console.log(`[Push] Auto-creating message for notification ${notification.id}. Type: ${notification.type}`);
            const msgData = notification.data;

            // Validate minimal requirements
            const senderId = msgData.sender_id;
            const recipientId = msgData.recipient_id || notification.user_id;
            const eventId = msgData.event_id;

            if (!senderId || !recipientId || !eventId) {
                console.warn('[Push] Skipping message creation due to missing required fields:', {
                    senderId, recipientId, eventId, notificationId: notification.id
                });
            } else {
                const messagePayload = {
                    event_id: eventId,
                    sender_id: senderId,
                    recipient_id: recipientId,
                    message_type: msgData.message_type || 'general',
                    subject: msgData.message_subject || notification.title || 'Event Notification',
                    body: msgData.message_body || notification.body || '',
                    event_link: msgData.link || null,
                    created_at: new Date().toISOString()
                };

                console.log('[Push] Inserting message:', JSON.stringify(messagePayload));

                const { data: insertedMsg, error: msgError } = await supabase.from('messages').insert(messagePayload).select().single();

                if (msgError) {
                    console.error('[Push] Message creation failed:', JSON.stringify(msgError));
                } else {
                    console.log('[Push] Message created successfully. ID:', insertedMsg?.id);
                }
            }
        }

        // 1. Get user's push tokens
        const { data: tokens, error: tokenError } = await supabase
            .from('expo_push_tokens')
            .select('token')
            .eq('user_id', notification.user_id);

        if (tokenError) throw tokenError;
        if (!tokens || tokens.length === 0) {
            console.log(`[Push] No push tokens found for user ${notification.user_id}. Skipping push.`);
            return new Response(JSON.stringify({ message: 'No tokens found' }), { status: 200 });
        }

        console.log(`[Push] Found ${tokens.length} tokens for user ${notification.user_id}`);

        // 2. Get unread count for badge
        const { count, error: countError } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', notification.user_id)
            .eq('read', false);

        if (countError) console.warn('[Push] Error fetching unread count:', countError);

        // 3. Prepare messages for Expo
        const messages = tokens.map((t: { token: string }) => ({
            to: t.token,
            sound: 'default',
            title: notification.title,
            body: notification.body,
            data: {
                ...notification.data,
                notification_id: notification.id,
                type: notification.type
            },
            badge: count || 0,
            priority: 'high',
            channelId: 'default',
        }));

        console.log(`[Push] Sending ${messages.length} messages to Expo...`);

        // 4. Send to Expo
        const response = await fetch(EXPO_PUSH_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(messages),
        });

        const result = await response.json();
        console.log('[Push] Expo response:', JSON.stringify(result));

        // 5. Mark as sent in DB
        await supabase
            .from('notifications')
            .update({ sent_at: new Date().toISOString() })
            .eq('id', notification.id);

        return new Response(JSON.stringify({ success: true, tokens_sent: messages.length }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error:', errorMessage);
        return new Response(JSON.stringify({ error: errorMessage }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});
