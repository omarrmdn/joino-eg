import { useUser } from '@clerk/clerk-expo';
import { useCallback, useEffect, useState } from 'react';
import { useSupabaseClient } from '../lib/supabaseConfig';
import { DBUser } from '../types/database';

export function useUserAnalytics() {
    const { user, isLoaded } = useUser();
    const supabase = useSupabaseClient();
    const [userData, setUserData] = useState<DBUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUserData = useCallback(async () => {
        if (!isLoaded) return;

        if (!user) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single();

            if (fetchError) {
                // If user not found (PGRST116), try to sync from Clerk
                if (fetchError.code === 'PGRST116') {
                    console.log('User not found in Supabase, syncing from Clerk...');
                    const { data: newUser, error: createError } = await supabase
                        .from('users')
                        .insert({
                            id: user.id,
                            email: user.primaryEmailAddress?.emailAddress,
                            name: user.fullName || 'User',
                            image_url: user.imageUrl,
                            created_at: new Date().toISOString()
                        })
                        .select()
                        .single();

                    if (createError) throw createError;
                    setUserData(newUser);
                    return;
                }
                throw fetchError;
            }
            setUserData(data);
        } catch (err) {
            console.error('Error fetching user analytics:', err);
            // Don't set error state for known sync issues to avoid UI disruption
            // setError(err instanceof Error ? err.message : 'Failed to fetch user analytics');
        } finally {
            setLoading(false);
        }
    }, [user, isLoaded, supabase]);

    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    const updateInterests = async (tags: string[]) => {
        if (!user) return;
        try {
            // 1. Update the users table (array of strings for quick lookup)
            const { error: updateError } = await supabase
                .from('users')
                .update({ interested_tags: tags })
                .eq('id', user.id);

            if (updateError) throw updateError;

            // 2. Sync with user_interests table (relational structure)
            // First, get tag IDs for the tag names
            const { data: tagData, error: tagError } = await supabase
                .from('tags')
                .select('id')
                .in('name', tags);

            if (tagError) throw tagError;

            const tagIds = tagData?.map(t => t.id) || [];

            // Delete existing interests for this user
            const { error: deleteError } = await supabase
                .from('user_interests')
                .delete()
                .eq('user_id', user.id);

            if (deleteError) throw deleteError;

            // Insert new interests
            if (tagIds.length > 0) {
                const interestEntries = tagIds.map(tagId => ({
                    user_id: user.id,
                    tag_id: tagId
                }));

                const { error: insertError } = await supabase
                    .from('user_interests')
                    .insert(interestEntries);

                if (insertError) throw insertError;
            }

            setUserData(prev => prev ? { ...prev, interested_tags: tags } : null);
        } catch (err) {
            console.error('Error updating interests:', err);
            throw err;
        }
    };

    const trackAction = async (action: string, metadata: any = {}) => {
        if (!user) return;

        try {
            // Call the edge function to analyze this action in the background
            // We don't await it if we want it to be fire-and-forget, 
            // but for tracking accuracy let's await it or at least handle errors.
            console.log(`[Analytics] Tracking action: ${action}`, metadata);

            const { error: funcError } = await supabase.functions.invoke('analyze-user-preferences', {
                body: {
                    user_id: user.id,
                    action: action,
                    metadata: metadata,
                    timestamp: new Date().toISOString()
                }
            });

            if (funcError) {
                console.warn("Failed to call analyze-user-preferences edge function:", funcError);
            }
        } catch (err) {
            console.error('Error tracking action with edge function:', err);
        }
    };

    return {
        userData,
        loading,
        error,
        refetch: fetchUserData,
        updateInterests,
        trackAction
    };
}
