import { SupabaseClient } from "@supabase/supabase-js";
import { notifyAttendeeEventAccessDetails } from "./eventNotifications";

/**
 * Test function to simulate an attendee joining an event 
 * and receiving the access details message from the organizer.
 */
export async function testOnlineLinkMessage(
    client: SupabaseClient,
    userId: string,
    eventId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        console.log(`[Test] Triggering online link message for user ${userId} and event ${eventId}`);

        // Check if event exists and is online with a link
        const { data: event, error: eventError } = await client
            .from('events')
            .select('title, is_online, link, organizer_id')
            .eq('id', eventId)
            .single();

        if (eventError) throw new Error(`Event not found: ${eventError.message}`);
        if (!event.is_online || !event.link) {
            throw new Error("Event is not online or has no link. Test requires an online event with a link.");
        }

        return await notifyAttendeeEventAccessDetails(client, eventId, userId);
    } catch (error: any) {
        console.error('[Test] Error in testOnlineLinkMessage:', error);
        return { success: false, error: error.message };
    }
}
