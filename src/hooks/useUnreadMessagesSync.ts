import { useUser } from '@clerk/clerk-expo';
import { useEffect } from 'react';
import { notificationManager } from '../lib/NotificationManager';
import { useSupabaseClient } from '../lib/supabaseConfig';

export function useUnreadMessagesSync() {
    const { user } = useUser();
    const supabase = useSupabaseClient();

    useEffect(() => {
        if (!user) return;

        const checkUnread = async () => {
            const { count, error } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('recipient_id', user.id)
                .eq('read', false);

            if (!error && count !== null) {
                notificationManager.setHasUnreadMessages(count > 0);
            }
        };

        checkUnread();

        const channel = supabase
            .channel('unread_messages_sync')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'messages',
                    filter: `recipient_id=eq.${user.id}`,
                },
                () => {
                    checkUnread();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, supabase]);
}
