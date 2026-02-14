import { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationType, PushNotificationData } from "./notifications";
import notificationService from "./notificationService";

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

    // If requested, send local notification immediately
    if (sendLocal) {
      await notificationService.sendLocalNotification(title, body, data);
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
      });

    if (error) {
      console.error("Supabase insert error:", error);
      throw error;
    }

    return {
      success: true,
      notificationId: undefined
    };
  } catch (error: any) {
    // Silence notification type check errors as they are known schema issues
    if (error?.message?.includes('notifications_type_check')) return { success: false, error: 'type_not_supported' };

    console.error("Error creating notification:", error);
    return { success: false, error: error.message };
  }
}
