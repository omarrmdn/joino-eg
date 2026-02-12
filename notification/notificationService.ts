// services/notificationService.ts

import * as Device from "expo-device";
import type { PushNotificationData } from "./notifications";
import { supabase } from "./supabase";

// Lazy load Notifications to avoid import errors in Expo Go
let Notifications: any = null;
let Platform: any = null;
let Constants: any = null;
let initialized = false;
let channelCreated = false;

/**
 * Check if we're running in Expo Go (which doesn't support push notifications in SDK 53+)
 */
function isExpoGo(): boolean {
  try {
    if (!Constants) {
      Constants = require("expo-constants").default;
    }
    return Constants.appOwnership === "expo";
  } catch {
    return false;
  }
}

/**
 * Get the project ID from multiple sources (env var, Constants, app.json extra)
 */
function getProjectId(): string | undefined {
  // 1. Try env var first
  if (process.env.EXPO_PUBLIC_PROJECT_ID) {
    return process.env.EXPO_PUBLIC_PROJECT_ID;
  }

  // 2. Try expo-constants
  try {
    if (!Constants) {
      Constants = require("expo-constants").default;
    }

    // Try easConfig first (available in EAS builds)
    const easProjectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (easProjectId) return easProjectId;

    // Try the constants projectId
    if (Constants.projectId) return Constants.projectId;

    // Try expoConfig.extra.projectId
    if (Constants.expoConfig?.extra?.projectId) return Constants.expoConfig.extra.projectId;
  } catch {
    // Constants not available
  }

  return undefined;
}

/**
 * Create the Android notification channel
 * Must be done before any notification is sent on Android
 */
async function ensureAndroidChannel(): Promise<void> {
  if (channelCreated) return;
  if (!Platform) return;
  if (Platform.OS !== "android") {
    channelCreated = true;
    return;
  }
  if (!Notifications?.setNotificationChannelAsync) return;

  try {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: 4, // AndroidImportance.MAX
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF5B04",
      sound: "default",
      enableVibrate: true,
      showBadge: true,
    });
    channelCreated = true;
    console.log("[NotificationService] Android notification channel created successfully");
  } catch (error) {
    console.warn("[NotificationService] Failed to create notification channel:", error);
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
      "[NotificationService] Push notifications not available in Expo Go. Use a development build instead.",
    );
    return;
  }

  try {
    Notifications = require("expo-notifications");
    Platform = require("react-native").Platform;

    // Configure how notifications are handled when app is in foreground
    if (Notifications?.setNotificationHandler) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
      console.log("[NotificationService] Notification handler configured");
    }

    // Eagerly create Android channel on init
    ensureAndroidChannel();
  } catch (error) {
    console.warn("[NotificationService] Notifications not available in this environment:", error);
  }
}

class NotificationService {
  /**
   * Register for push notifications and save token to Supabase
   */
  async registerForPushNotifications(userId: string, supabaseClient?: any): Promise<string | null> {
    initializeNotifications();

    if (!Notifications) {
      console.warn("[NotificationService] Notifications module not loaded — skipping registration");
      return null;
    }

    if (!Device.isDevice) {
      console.warn("[NotificationService] Must use physical device for Push Notifications");
      return null;
    }

    try {
      // Ensure Android channel exists first
      await ensureAndroidChannel();

      // Check existing permissions
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync?.();
      let finalStatus = existingStatus;

      console.log("[NotificationService] Current permission status:", existingStatus);

      // Request permissions if not granted
      if (existingStatus !== "granted") {
        console.log("[NotificationService] Requesting notification permissions...");
        const { status } = await Notifications.requestPermissionsAsync?.();
        finalStatus = status;
        console.log("[NotificationService] Permission request result:", status);
      }

      if (finalStatus !== "granted") {
        console.warn("[NotificationService] Notification permission denied! Status:", finalStatus);
        return null;
      }

      // Get the project ID
      const projectId = getProjectId();
      console.log("[NotificationService] Using project ID:", projectId);

      if (!projectId) {
        console.error("[NotificationService] No project ID found! Cannot get push token.");
        return null;
      }

      // Get the Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync?.({
        projectId,
      });

      const token = tokenData?.data;

      if (!token) {
        console.error("[NotificationService] Failed to get push token — no token returned");
        return null;
      }

      console.log("[NotificationService] Push token obtained:", token.substring(0, 20) + "...");

      // Save token to Supabase
      await this.saveTokenToDatabase(userId, token, supabaseClient);

      return token;
    } catch (error) {
      console.error("[NotificationService] Error registering for push notifications:", error);
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
        console.error("[NotificationService] Error saving push token:", error);
      } else {
        console.log("[NotificationService] Push token saved to database");
      }
    } catch (error) {
      console.error("[NotificationService] Error in saveTokenToDatabase:", error);
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
        console.error("[NotificationService] Error removing push token:", error);
      }
    } catch (error) {
      console.error("[NotificationService] Error in removeToken:", error);
    }
  }

  /**
   * Send a local notification (useful for testing and real-time DB trigger)
   */
  async sendLocalNotification(
    title: string,
    body: string,
    data?: PushNotificationData,
  ): Promise<void> {
    initializeNotifications();
    if (!Notifications?.scheduleNotificationAsync) return;

    // Ensure channel exists on Android before sending
    await ensureAndroidChannel();

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: true,
          ...(Platform?.OS === "android" ? { channelId: "default" } : {}),
        },
        trigger: null, // null = immediate delivery
      });
      console.log("[NotificationService] Local notification sent:", title);
    } catch (error) {
      console.error("[NotificationService] Error sending local notification:", error);
    }
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

    await ensureAndroidChannel();

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: true,
          ...(Platform?.OS === "android" ? { channelId: "default" } : {}),
        },
        trigger: {
          type: "date",
          date: trigger,
          ...(Platform?.OS === "android" ? { channelId: "default" } : {}),
        },
      });
      return notificationId;
    } catch (error) {
      console.error("[NotificationService] Error scheduling notification:", error);
      return "";
    }
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
    try {
      return await Notifications.getBadgeCountAsync();
    } catch {
      return 0;
    }
  }

  /**
   * Set notification badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    initializeNotifications();
    if (!Notifications?.setBadgeCountAsync) return;
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch {
      // Badge count not supported on all devices
    }
  }

  /**
   * Clear all notifications from notification center
   */
  async clearAllNotifications(): Promise<void> {
    initializeNotifications();
    if (!Notifications?.dismissAllNotificationsAsync) return;
    try {
      await Notifications.dismissAllNotificationsAsync();
    } catch {
      // Dismiss may fail silently on some devices
    }
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
    try {
      return await Notifications.getLastNotificationResponseAsync();
    } catch {
      return null;
    }
  }
}

export default new NotificationService();
