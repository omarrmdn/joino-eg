import { useUser } from '@clerk/clerk-expo';
import { useCallback, useEffect, useState } from 'react';
import { notificationManager } from '../lib/NotificationManager';
import { useSupabaseClient } from '../lib/supabaseConfig';

export interface DBMessage {
    id: string;
    event_id: string;
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
    };
}

export function useMessages() {
    const { user } = useUser();
    const supabase = useSupabaseClient();
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
            setLoading(false);
            return;
        }

        try {
            if (isInitial) setLoading(true);
            setError(null);

            // Fetch messages where user is sender or recipient
            const { data, error: fetchError } = await supabase
                .from('messages')
                .select(`
          *,
          sender:users!messages_sender_id_fkey (name, image_url),
          recipient:users!messages_recipient_id_fkey (name, image_url),
          event:events (title)
        `)
                .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            // Filter out self-memos for link messages (redundant but safe)
            const msgs = (data || []).filter(m => !(m.sender_id === m.recipient_id && m.message_type === 'event_link'));
            setMessages(msgs);
        } catch (err) {
            console.error('Error fetching messages:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch messages');
        } finally {
            if (isInitial) setLoading(false);
        }
    }, [user, supabase, checkUnread]);

    useEffect(() => {
        fetchMessages();

        if (!user) return;

        // Real-time subscription for new messages
        const channel = supabase
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

        return () => {
            supabase.removeChannel(channel);
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
            setMessages(prev => [data, ...prev]);
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
