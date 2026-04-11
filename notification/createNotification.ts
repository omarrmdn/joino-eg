import { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationType, PushNotificationData } from "./notifications";

export async function createNotification(
  client: SupabaseClient,
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  data?: PushNotificationData,
  sendLocal: boolean = false
): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  try {
    console.log(`Creating notification: type=${type}, userId=${userId}, title=${title}, local=${sendLocal}`);

    // Idempotency check: don't insert if an identical notification was created in the last 30 seconds
    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
    const { data: existingNotif } = await client
      .from("notifications")
      .select("id")
      .eq("user_id", userId)
      .eq("type", type)
      .eq("title", title)
      .eq("body", body)
      .gt("created_at", thirtySecondsAgo)
      .maybeSingle();

    if (existingNotif) {
      console.log(`[Notification] Duplicate detected within 30s. Skipping insert. ID: ${existingNotif.id}`);
      return { success: true, notificationId: existingNotif.id };
    }

    const { data: notification, error } = await client
      .from("notifications")
      .insert({
        user_id: userId,
        type,
        title,
        body,
        data: data || {},
        read: false,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      throw error;
    }

    console.log(`[Notification] Inserted successfully. ID: ${notification?.id}`);

    return {
      success: true,
      notificationId: notification?.id,
    };
  } catch (error: any) {
    // Silence notification type check errors as they are known schema issues
    if (error?.message?.includes('notifications_type_check')) return { success: false, error: 'type_not_supported' };

    console.error("Error creating notification:", error);
    return { success: false, error: error.message };
  }
}
