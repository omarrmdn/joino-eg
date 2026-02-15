import { useUser } from '@clerk/clerk-expo';
import { useCallback, useEffect, useState } from 'react';
import { notifyNewMessage } from '../../notification/eventNotifications';
import { notificationManager } from '../lib/NotificationManager';
import { useSupabaseClient } from '../lib/supabaseConfig';
import { useTrackSession } from './useTrackSession';

export interface DBMessage {
    id: string;
    event_id: string | null;
    sender_id: string;
    recipient_id: string;
    message_type: 'event_published' | 'event_update' | 'general' | 'event_link';
    subject: string | null;
    body: string;
    event_link: string | null;
    read: boolean;
    created_at: string;
    read_at: string | null;
    sender?: {
        name: string | null;
        image_url: string | null;
    };
    recipient?: {
        name: string | null;
        image_url: string | null;
    };
    event?: {
        title: string;
        organizer_id?: string | null;
    };
}

export function useMessages() {
    const { user } = useUser();
    const supabase = useSupabaseClient();
    const { trackAction } = useTrackSession();
    const [messages, setMessages] = useState<DBMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const checkUnread = useCallback((msgs: DBMessage[]) => {
        if (!user) return;
        const hasUnread = msgs.some(m => !m.read && m.recipient_id === user.id);
        notificationManager.setHasUnreadMessages(hasUnread);
    }, [user]);

    const fetchMessages = useCallback(async (isInitial = true) => {
        if (!user) {
            console.log('[useMessages] No user found, skipping fetch');
            setLoading(false);
            return;
        }

        try {
            if (isInitial) setLoading(true);
            setError(null);
            console.log(`[useMessages] Fetching for user: ${user.id} (${user.fullName})`);

            // Fetch messages where user is sender or recipient
            console.log(`[useMessages] Fetching messages and questions for ${user.id}...`);
            // Fetch messages where user is sender OR recipient (split to avoid UUID casting issues in .or() with PostgREST)
            console.log(`[useMessages] Fetching messages and questions for ${user.id}...`);

            const [msgSender, msgRecipient, qUser, qOrganizer] = await Promise.all([
                supabase
                    .from('messages')
                    .select('*, sender:users!messages_sender_id_fkey (name, image_url), recipient:users!messages_recipient_id_fkey (name, image_url), event:events (title, organizer_id)')
                    .eq('sender_id', user.id),
                supabase
                    .from('messages')
                    .select('*, sender:users!messages_sender_id_fkey (name, image_url), recipient:users!messages_recipient_id_fkey (name, image_url), event:events (title, organizer_id)')
                    .eq('recipient_id', user.id),
                supabase
                    .from('event_questions')
                    .select('*, user:users!event_questions_user_id_fkey (name, image_url), organizer:users!event_questions_organizer_id_fkey (name, image_url), event:events (title, organizer_id)')
                    .eq('user_id', user.id),
                supabase
                    .from('event_questions')
                    .select('*, user:users!event_questions_user_id_fkey (name, image_url), organizer:users!event_questions_organizer_id_fkey (name, image_url), event:events (title, organizer_id)')
                    .eq('organizer_id', user.id)
            ]);

            if (msgSender.error) {
                console.error(`[useMessages] sender_id query failed for user ${user.id}:`, msgSender.error);
                throw new Error(`MSG_S: ${msgSender.error.message}`);
            }
            if (msgRecipient.error) {
                console.error(`[useMessages] recipient_id query failed for user ${user.id}:`, msgRecipient.error);
                throw new Error(`MSG_R: ${msgRecipient.error.message}`);
            }
            if (qUser.error) {
                console.error(`[useMessages] question user_id query failed for user ${user.id}:`, qUser.error);
                throw new Error(`QUEST_U: ${qUser.error.message}`);
            }
            if (qOrganizer.error) {
                console.error(`[useMessages] question organizer_id query failed for user ${user.id}:`, qOrganizer.error);
                throw new Error(`QUEST_O: ${qOrganizer.error.message}`);
            }

            const allMsgData = [...(msgSender.data || []), ...(msgRecipient.data || [])];
            const allQData = [...(qUser.data || []), ...(qOrganizer.data || [])];

            // Filter out exact duplicates (though IDs should be unique)
            const uniqueMsgData = Array.from(new Map(allMsgData.map(m => [m.id, m])).values());
            const uniqueQData = Array.from(new Map(allQData.map(q => [q.id, q])).values());

            console.log(`[useMessages] Fetched ${uniqueMsgData.length} unique messages and ${uniqueQData.length} unique questions`);

            // Normalize questions to DBMessage format
            const normalizedQuestions: DBMessage[] = (uniqueQData || []).flatMap(q => {
                const msgs: DBMessage[] = [];

                // The question itself
                msgs.push({
                    id: `q-${q.id}`,
                    event_id: q.event_id,
                    sender_id: q.user_id,
                    recipient_id: q.organizer_id,
                    message_type: 'general',
                    subject: 'Question',
                    body: q.question,
                    event_link: null,
                    read: !!q.answer, // If it has an answer, count as "read" for the question list logic
                    created_at: q.created_at,
                    read_at: q.answered_at,
                    sender: q.user,
                    recipient: q.organizer,
                    event: q.event
                });

                // The answer if it exists
                if (q.answer) {
                    msgs.push({
                        id: `a-${q.id}`,
                        event_id: q.event_id,
                        sender_id: q.organizer_id,
                        recipient_id: q.user_id,
                        message_type: 'general',
                        subject: 'Answer',
                        body: q.answer,
                        event_link: null,
                        read: true,
                        created_at: q.answered_at || q.created_at,
                        read_at: q.answered_at,
                        sender: q.organizer,
                        recipient: q.user,
                        event: q.event
                    });
                }

                return msgs;
            });

            // Combine messages and sorted by created_at desc
            const allMessages = [
                ...uniqueMsgData,
                ...normalizedQuestions
            ].sort((a, b) => b.created_at.localeCompare(a.created_at));

            console.log(`[useMessages] Combined into ${allMessages.length} total message units for display`);
            setMessages(allMessages);
        } catch (err) {
            console.error('[useMessages] error fetching messages:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch messages');
        } finally {
            if (isInitial) setLoading(false);
        }
    }, [user, supabase, checkUnread]);

    useEffect(() => {
        fetchMessages();

        if (!user) return;

        // Real-time subscription for new messages and questions
        const messagesChannel = supabase
            .channel('messages_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'messages',
                },
                () => {
                    fetchMessages(false);
                }
            )
            .subscribe();

        const questionsChannel = supabase
            .channel('questions_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'event_questions',
                },
                () => {
                    fetchMessages(false);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(messagesChannel);
            supabase.removeChannel(questionsChannel);
        };
    }, [fetchMessages, user, supabase]);

    const sendMessage = async (message: Partial<DBMessage>) => {
        try {
            const { data, error: sendError } = await supabase
                .from('messages')
                .insert({
                    ...message,
                    sender_id: user?.id,
                    created_at: new Date().toISOString(),
                })
                .select(`
                    *,
                    sender:users!messages_sender_id_fkey (name, image_url),
                    recipient:users!messages_recipient_id_fkey (name, image_url),
                    event:events (title)
                `)
                .single();

            if (sendError) throw sendError;

            // Send push notification to recipient
            if (data.recipient_id) {
                await notifyNewMessage(
                    supabase,
                    data.recipient_id,
                    user?.fullName || "Someone",
                    data.body,
                    data.event_id
                );
            }

            setMessages(prev => [data, ...prev]);
            trackAction('message_send', {
                messageId: data.id,
                eventId: data.event_id,
                recipientId: data.recipient_id,
                senderId: data.sender_id
            });
            return data;
        } catch (err) {
            console.error('Error sending message:', err);
            throw err;
        }
    };

    const markAsRead = async (messageId: string) => {
        try {
            const { error: updateError } = await supabase
                .from('messages')
                .update({ read: true, read_at: new Date().toISOString() })
                .eq('id', messageId);

            if (updateError) throw updateError;
            setMessages(prev => prev.map(m => m.id === messageId ? { ...m, read: true } : m));
            trackAction('message_read', { messageId });
        } catch (err) {
            console.error('Error marking message as read:', err);
        }
    };

    const markAllAsRead = async () => {
        if (!user) return;
        try {
            const { error: updateError } = await supabase
                .from('messages')
                .update({ read: true, read_at: new Date().toISOString() })
                .eq('recipient_id', user.id)
                .eq('read', false);

            if (updateError) throw updateError;
            setMessages(prev => prev.map(m => m.recipient_id === user.id ? { ...m, read: true } : m));
            trackAction('message_read', { all: true });
        } catch (err) {
            console.error('Error marking all messages as read:', err);
        }
    };

    useEffect(() => {
        if (!messages) return;
        checkUnread(messages);
    }, [messages, checkUnread]);

    return {
        messages,
        loading,
        error,
        refetch: fetchMessages,
        sendMessage,
        markAsRead,
        markAllAsRead
    };
}
