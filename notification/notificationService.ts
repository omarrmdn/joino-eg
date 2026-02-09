// services/notificationService.ts

import * as Device from "expo-device";
import type { PushNotificationData } from "./notifications";
import { supabase } from "./supabase";

// Lazy load Notifications to avoid import errors in Expo Go
let Notifications: any = null;
let Platform: any = null;
let initialized = false;

/**
 * Check if we're running in Expo Go (which doesn't support push notifications in SDK 53+)
 */
function isExpoGo(): boolean {
  try {
    const Constants = require("expo-constants").default;
    return Constants.appOwnership === "expo";
  } catch {
    return false;
  }
}

/**
 * Initialize notifications - only called when needed
 * This defers the import until actually required, preventing Expo Go errors
 */
function initializeNotifications() {
  if (initialized) return;
  initialized = true;

  // Skip initialization if running in Expo Go
  if (isExpoGo()) {
    console.log(
      "Push notifications not available in Expo Go. Use a development build instead.",
    );
    return;
  }

  try {
    Notifications = require("expo-notifications");
    Platform = require("react-native").Platform;

    // Configure how notifications are handled when app is in foreground
    // Only set handler if we're on a real device
    if (Notifications?.setNotificationHandler && Device.isDevice) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
    }
  } catch (error) {
    console.log("Notifications not available in this environment:", error);
  }
}

class NotificationService {
  /**
   * Register for push notifications and save token to Supabase
   */
  async registerForPushNotifications(userId: string, supabaseClient?: any): Promise<string | null> {
    initializeNotifications();

    if (!Notifications) {
      console.log("Notifications module not loaded");
      return null;
    }

    if (!Device.isDevice) {
      console.log("Must use physical device for Push Notifications");
      return null;
    }

    try {
      // Check existing permissions
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync?.();
      let finalStatus = existingStatus;

      // Request permissions if not granted
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync?.();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("Failed to get push token for push notification!");
        return null;
      }

      // Get the token
      const tokenData = await Notifications.getExpoPushTokenAsync?.({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      });

      const token = tokenData?.data;

      // Save token to Supabase
      await this.saveTokenToDatabase(userId, token, supabaseClient);

      // Set notification channel for Android (optional)
      if (Platform?.OS === "android") {
        try {
          if (Notifications.setNotificationChannelAsync) {
            await Notifications.setNotificationChannelAsync("default", {
              name: "default",
              importance: 4, // AndroidImportance.MAX
              vibrationPattern: [0, 250, 250, 250],
              lightColor: "#FF231F7C",
            });
          }
        } catch (channelError) {
          console.log("Notification channel setup skipped");
        }
      }

      return token;
    } catch (error) {
      console.error("Error registering for push notifications:", error);
      return null;
    }
  }

  /**
   * Save Expo push token to Supabase
   */
  private async saveTokenToDatabase(
    userId: string,
    token: string,
    supabaseClient?: any,
  ): Promise<void> {
    try {
      const client = supabaseClient || supabase;
      const deviceName =
        Device.deviceName || `${Device.brand} ${Device.modelName}`;

      const { error } = await client.from("expo_push_tokens").upsert(
        {
          user_id: userId,
          token: token,
          device_name: deviceName,
          last_used: new Date().toISOString(),
        },
        {
          onConflict: "token",
        },
      );

      if (error) {
        console.error("Error saving push token:", error);
      }
    } catch (error) {
      console.error("Error in saveTokenToDatabase:", error);
    }
  }

  /**
   * Remove push token from database (on logout)
   */
  async removeToken(token: string, supabaseClient?: any): Promise<void> {
    try {
      const client = supabaseClient || supabase;
      const { error } = await client
        .from("expo_push_tokens")
        .delete()
        .eq("token", token);

      if (error) {
        console.error("Error removing push token:", error);
      }
    } catch (error) {
      console.error("Error in removeToken:", error);
    }
  }

  /**
   * Send a local notification (useful for testing)
   */
  async sendLocalNotification(
    title: string,
    body: string,
    data?: PushNotificationData,
  ): Promise<void> {
    initializeNotifications();
    if (!Notifications?.scheduleNotificationAsync) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: null,
    });
  }

  /**
   * Schedule a local notification for future delivery
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    trigger: Date,
    data?: PushNotificationData,
  ): Promise<string> {
    initializeNotifications();
    if (!Notifications?.scheduleNotificationAsync) return "";
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: {
        date: trigger,
      },
    });
    return notificationId;
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelScheduledNotification(notificationId: string): Promise<void> {
    initializeNotifications();
    if (!Notifications?.cancelScheduledNotificationAsync) return;
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllScheduledNotifications(): Promise<void> {
    initializeNotifications();
    if (!Notifications?.cancelAllScheduledNotificationsAsync) return;
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Get notification badge count
   */
  async getBadgeCount(): Promise<number> {
    initializeNotifications();
    if (!Notifications?.getBadgeCountAsync) return 0;
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Set notification badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    initializeNotifications();
    if (!Notifications?.setBadgeCountAsync) return;
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Clear all notifications from notification center
   */
  async clearAllNotifications(): Promise<void> {
    initializeNotifications();
    if (!Notifications?.dismissAllNotificationsAsync) return;
    await Notifications.dismissAllNotificationsAsync();
  }

  /**
   * Add listener for when notification is received
   */
  addNotificationReceivedListener(callback: (notification: any) => void) {
    initializeNotifications();
    if (!Notifications?.addNotificationReceivedListener)
      return { remove: () => { } };
    return Notifications.addNotificationReceivedListener(callback);
  }

  /**
   * Add listener for when notification is tapped/clicked
   */
  addNotificationResponseReceivedListener(callback: (response: any) => void) {
    initializeNotifications();
    if (!Notifications?.addNotificationResponseReceivedListener)
      return { remove: () => { } };
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  /**
   * Get last notification response (useful for app launch from notification)
   */
  async getLastNotificationResponse(): Promise<any | null> {
    initializeNotifications();
    if (!Notifications?.getLastNotificationResponseAsync) return null;
    return await Notifications.getLastNotificationResponseAsync();
  }
}

export default new NotificationService();
