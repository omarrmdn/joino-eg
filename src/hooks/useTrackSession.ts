import { useAuth } from '@clerk/clerk-expo';
import { useCallback, useEffect, useRef } from 'react';
import { useSupabaseClient } from '../lib/supabaseConfig';

let globalSessionId: string | null = null;
let isStartingSession = false;

type InteractionType =
    | 'event_view'
    | 'event_join'
    | 'event_leave'
    | 'event_create'
    | 'event_update'
    | 'event_cancel'
    | 'event_rate'
    | 'event_search'
    | 'question_ask'
    | 'question_answer'
    | 'message_send'
    | 'message_read'
    | 'profile_view'
    | 'profile_update'
    | 'notification_read'
    | 'tag_select'
    | 'location_update'
    | 'login'
    | 'logout'
    | 'app_open'
    | 'app_close';

type EntityType =
    | 'event'
    | 'user'
    | 'message'
    | 'notification'
    | 'question'
    | 'rating'
    | 'tag';

const INTERACTION_TYPE_MAP: Record<string, InteractionType> = {
    view_event_details: 'event_view',
    view_event: 'event_view',
    view_event_compact: 'event_view',
    share_event_details: 'event_view',
    share_event_card: 'event_view',
    initiate_join: 'event_join',
    join_success: 'event_join',
    join_error: 'event_join',
    cancel_attendance: 'event_leave',
    cancel_attendance_error: 'event_leave',
    cancel_event: 'event_cancel',
    delete_event: 'event_cancel',
    edit_event_success: 'event_update',
    create_event_success: 'event_create',
    search_screen_query: 'event_search',
    location_use_current_for_event: 'location_update',
    location_request_manual: 'location_update'
};

const ALLOWED_INTERACTION_TYPES = new Set<InteractionType>([
    'event_view',
    'event_join',
    'event_leave',
    'event_create',
    'event_update',
    'event_cancel',
    'event_rate',
    'event_search',
    'question_ask',
    'question_answer',
    'message_send',
    'message_read',
    'profile_view',
    'profile_update',
    'notification_read',
    'tag_select',
    'location_update',
    'login',
    'logout',
    'app_open',
    'app_close'
]);

const resolveInteractionType = (action: string): InteractionType => {
    if (ALLOWED_INTERACTION_TYPES.has(action as InteractionType)) {
        return action as InteractionType;
    }

    const mapped = INTERACTION_TYPE_MAP[action];
    if (mapped) {
        return mapped;
    }

    console.warn(`[useTrackSession] Unmapped action "${action}", defaulting to app_open.`);
    return 'app_open';
};

const resolveEntity = (metadata: any): { entity_type?: EntityType; entity_id?: string } => {
    if (!metadata) return {};

    if (metadata.eventId) return { entity_type: 'event', entity_id: metadata.eventId };
    if (metadata.userId) return { entity_type: 'user', entity_id: metadata.userId };
    if (metadata.messageId) return { entity_type: 'message', entity_id: metadata.messageId };
    if (metadata.notificationId) return { entity_type: 'notification', entity_id: metadata.notificationId };
    if (metadata.questionId) return { entity_type: 'question', entity_id: metadata.questionId };
    if (metadata.ratingId) return { entity_type: 'rating', entity_id: metadata.ratingId };
    if (metadata.tagId) return { entity_type: 'tag', entity_id: metadata.tagId };

    return {};
};

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

        try {
            const interactionType = resolveInteractionType(action);
            const { entity_type, entity_id } = resolveEntity(metadata);

            await supabase.from('user_interactions').insert({
                user_id: userId ?? null,
                session_id: globalSessionId ?? null,
                interaction_type: interactionType,
                entity_type: entity_type ?? null,
                entity_id: entity_id ?? null,
                interaction_data: { action, ...metadata }
            });

            if (globalSessionId) {
                await supabase
                    .from('user_sessions')
                    .update({
                        actions: actions.current
                    })
                    .eq('id', globalSessionId);
            }

            if (userId) {
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
            }
        } catch (err) {
            console.error('Error tracking action:', err);
        }
    }, [supabase, userId]);

    return { trackAction };
}
