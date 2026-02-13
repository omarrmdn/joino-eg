// @ts-ignore: Deno HTTPS imports are valid in Supabase Edge Functions
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-ignore: Deno HTTPS imports are valid in Supabase Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

serve(async (req: Request) => {
    try {
        // @ts-ignore: Deno is available in Supabase environment
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        // @ts-ignore: Deno is available in Supabase environment
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const payload = await req.json();
        const event = payload.record;

        if (!event || !event.id) {
            return new Response(JSON.stringify({ error: 'No event record found' }), { status: 400 });
        }

        console.log(`Processing discovery for event ${event.id}: ${event.title}`);

        // 1. Get event tags
        const { data: eventTags } = await supabase
            .from('event_tags')
            .select('tags(name)')
            .eq('event_id', event.id);

        const tagNames = eventTags?.map((et: any) => et.tags?.name).filter(Boolean) || [];

        // 2. Find matching users
        let usersToNotify: Set<string> = new Set();

        // A. Filter by Interests
        if (tagNames.length > 0) {
            const { data: interestMatches } = await supabase
                .from('users')
                .select('id')
                .overlaps('interested_tags', tagNames);

            interestMatches?.forEach((u: any) => usersToNotify.add(u.id));
        }

        // B. Filter by Proximity (if onsite and has coords)
        if (!event.is_online && event.latitude && event.longitude) {
            const latRange = 0.45; // ~50km
            const lngRange = 0.45;

            const { data: nearbyUsers } = await supabase
                .from('users')
                .select('id')
                .gte('latitude', event.latitude - latRange)
                .lte('latitude', event.latitude + latRange)
                .gte('longitude', event.longitude - lngRange)
                .lte('longitude', event.longitude + lngRange);

            nearbyUsers?.forEach((u: any) => usersToNotify.add(u.id));
        }

        // Remove the organizer
        if (event.organizer_id) {
            usersToNotify.delete(event.organizer_id);
        }

        const userIds = Array.from(usersToNotify);
        if (userIds.length === 0) {
            return new Response(JSON.stringify({ message: 'No users to notify' }), { status: 200 });
        }

        // Get user languages to localize
        const { data: userData } = await supabase
            .from('users')
            .select('id, language')
            .in('id', userIds);

        const userLangMap = new Map(userData?.map((u: any) => [u.id, u.language || 'en']));

        // 3. Create notifications
        const batchSize = 50;
        for (let i = 0; i < userIds.length; i += batchSize) {
            const batch = userIds.slice(i, i + batchSize);
            const notifications = batch.map(userId => {
                const lang = (userLangMap.get(userId) || 'en') as string;
                const isArabic = lang.startsWith('ar');

                return {
                    user_id: userId,
                    type: 'recommendation',
                    title: isArabic ? 'فعالية قد تعجبك' : 'Event you may like',
                    body: isArabic
                        ? `لاقينا فعالية "${event.title}" ممكن تهمك!`
                        : `Check out "${event.title}" - it matches your interests or is nearby!`,
                    data: {
                        event_id: event.id,
                        event_title: event.title
                    },
                    read: false
                };
            });

            const { error: insertError } = await supabase
                .from('notifications')
                .insert(notifications);

            if (insertError) console.error('Batch insert error:', insertError);
        }

        return new Response(JSON.stringify({ success: true, count: userIds.length }), { status: 200 });

    } catch (error: any) {
        console.error('Discovery Error:', error.message);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
});
