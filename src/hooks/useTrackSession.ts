import { useAuth } from '@clerk/clerk-expo';
import { useCallback, useEffect, useRef } from 'react';
import { useSupabaseClient } from '../lib/supabaseConfig';

let globalSessionId: string | null = null;
let isStartingSession = false;

export function useTrackSession() {
    const { userId } = useAuth();
    const supabase = useSupabaseClient();
    const actions = useRef<any[]>([]);

    useEffect(() => {
        if (!userId || globalSessionId || isStartingSession) return;

        const startSession = async () => {
            isStartingSession = true;
            try {
                console.log(`[useTrackSession] Starting session for user: ${userId}`);
                const { data, error } = await supabase
                    .from('user_sessions')
                    .insert({
                        user_id: userId,
                        session_start: new Date().toISOString(),
                        actions: []
                    })
                    .select('id')
                    .single();

                if (error) throw error;
                if (data) {
                    globalSessionId = data.id;
                    console.log(`[useTrackSession] Session started: ${data.id}`);
                }
            } catch (err: any) {
                // Ignore power_score error or foreign key violation (user not synced yet)
                if (err?.message?.includes('power_score')) return;
                if (err?.code === '23503') {
                    console.warn('[useTrackSession] User not found in DB, skipping session start.');
                    return;
                }
                console.error('Error starting session:', err);
            } finally {
                isStartingSession = false;
            }
        };

        startSession();

        // Note: Clean up (session_end) is better handled at a high-level layout 
        // than in every individual component using this hook.
    }, [userId, supabase]);

    const trackAction = useCallback(async (action: string, metadata: any = {}) => {
        const actionItem = {
            action,
            timestamp: new Date().toISOString(),
            ...metadata
        };
        actions.current.push(actionItem);

        if (globalSessionId) {
            try {
                await supabase
                    .from('user_sessions')
                    .update({
                        actions: actions.current
                    })
                    .eq('id', globalSessionId);

                // Call the edge function to analyze this action in the background
                await supabase.functions.invoke('analyze-user-preferences', {
                    body: {
                        user_id: userId,
                        session_id: globalSessionId,
                        action: action,
                        metadata: metadata,
                        timestamp: new Date().toISOString()
                    }
                });
            } catch (err) {
                console.error('Error tracking action:', err);
            }
        }
    }, [supabase]);

    return { trackAction };
}