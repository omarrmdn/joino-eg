import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Track an event view
 */
export async function trackEventView(
  client: SupabaseClient,
  eventId: string,
  userId: string | null,
  sessionId?: string,
): Promise<void> {
  try {
    const { error } = await client.from("event_views").insert({
      event_id: eventId,
      user_id: userId,
      session_id: sessionId,
      viewed_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error tracking event view:", error);
    }
  } catch (error) {
    console.error("Error in trackEventView:", error);
  }
}

/**
 * Get event view statistics
 */
export async function getEventViewStats(client: SupabaseClient, eventId: string) {
  try {
    const { count, error } = await client
      .from("event_views")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId);

    if (error) throw error;

    return count || 0;
  } catch (error) {
    console.error("Error getting event view stats:", error);
    return 0;
  }
}

/**
 * Ask a question about an event
 */
export async function askEventQuestion(
  client: SupabaseClient,
  eventId: string,
  userId: string,
  organizerId: string,
  question: string,
): Promise<{ success: boolean; questionId?: string; error?: string }> {
  try {
    const { data, error } = await client
      .from("event_questions")
      .insert({
        event_id: eventId,
        user_id: userId,
        organizer_id: organizerId,
        question: question.trim(),
      })
      .select()
      .single();

    if (error) throw error;

    // Notify organizer
    const { data: askerData } = await client
      .from("users")
      .select("name")
      .eq("id", userId)
      .single();

    if (askerData) {
      const { notifyNewQuestion } = await import("./eventNotifications");
      await notifyNewQuestion(
        client,
        eventId,
        organizerId,
        data.id,
        askerData.name || "Someone",
      );
    }

    return { success: true, questionId: data.id };
  } catch (error: any) {
    console.error("Error asking question:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get questions for an event
 */
export async function getEventQuestions(client: SupabaseClient, eventId: string) {
  try {
    const { data, error } = await client
      .from("event_questions")
      .select(
        `
        *,
        user:users!event_questions_user_id_fkey(id, name, image_url),
        organizer:users!event_questions_organizer_id_fkey(id, name)
      `,
      )
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error("Error getting event questions:", error);
    return [];
  }
}

/**
 * Answer a question (organizer only)
 */
export async function answerEventQuestion(
  client: SupabaseClient,
  questionId: string,
  answer: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get question details
    const { data: question, error: fetchError } = await client
      .from("event_questions")
      .select("user_id, event_id, organizer_id")
      .eq("id", questionId)
      .single();

    if (fetchError) throw fetchError;

    const { error } = await client
      .from("event_questions")
      .update({
        answer: answer.trim(),
        answered_at: new Date().toISOString(),
      })
      .eq("id", questionId);

    if (error) throw error;

    // Notify attendee of answer
    const { data: organizerData } = await client
      .from("users")
      .select("name")
      .eq("id", question.organizer_id)
      .single();

    if (organizerData) {
      const { notifyQuestionAnswer } = await import("./eventNotifications");
      await notifyQuestionAnswer(
        client,
        question.event_id,
        question.user_id,
        organizerData.name || "Organizer",
      );
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error answering question:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Join an event (RSVP)
 */
export async function joinEvent(
  client: SupabaseClient,
  eventId: string,
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await client.from("attendees").insert({
      event_id: eventId,
      user_id: userId,
      joined_at: new Date().toISOString(),
    });

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error("Error joining event:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Leave an event (cancel RSVP)
 */
export async function leaveEvent(
  client: SupabaseClient,
  eventId: string,
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get attendee name for notification
    const { data: attendeeData } = await client
      .from("users")
      .select("name")
      .eq("id", userId)
      .single();

    // Get event organizer
    const { data: eventData } = await client
      .from("events")
      .select("organizer_id")
      .eq("id", eventId)
      .single();

    const { error } = await client
      .from("attendees")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", userId);

    if (error) throw error;

    // Notify organizer of cancellation
    if (eventData && attendeeData) {
      const { notifyAttendeeCancellation } =
        await import("./eventNotifications");
      await notifyAttendeeCancellation(
        client,
        eventId,
        eventData.organizer_id,
        attendeeData.name || "Someone",
      );
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error leaving event:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if user is attending an event
 */
export async function isUserAttending(
  client: SupabaseClient,
  eventId: string,
  userId: string,
): Promise<boolean> {
  try {
    const { data, error } = await client
      .from("attendees")
      .select("event_id")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    return !!data;
  } catch (error) {
    console.error("Error checking attendance:", error);
    return false;
  }
}
