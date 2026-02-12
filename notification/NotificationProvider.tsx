// components/NotificationProvider.tsx

import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import { notificationManager } from "../src/lib/NotificationManager";
import { useSupabaseClient } from "../src/lib/supabaseConfig";
import notificationService from "./notificationService";
import type { Notification } from "./notifications";

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, isSignedIn } = useAuth();
  const supabase = useSupabaseClient();
  const router = useRouter();
  const responseListener = useRef<any>(null);
  const receivedListener = useRef<any>(null);
  const appState = useRef(AppState.currentState);
  const registrationAttempted = useRef(false);

  useEffect(() => {
    if (!isSignedIn || !userId) {
      registrationAttempted.current = false;
      return;
    }

    // 1. Unread Check Function
    const checkUnread = async () => {
      try {
        const { count, error } = await supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("read", false);

        if (!error && count !== null) {
          notificationManager.setHasUnreadNotifications(count > 0);
          await notificationService.setBadgeCount(count);
        }
      } catch (e) {
        console.warn("[NotificationProvider] Failed to check unread count:", e);
      }
    };

    // Initial check
    checkUnread();

    // 2. AppState Listener (Refresh count when return to app)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        console.log("[NotificationProvider] App has come to the foreground!");
        checkUnread();
      }
      appState.current = nextAppState;
    };

    const appStateSubscription = AppState.addEventListener("change", handleAppStateChange);

    // 3. Register for push notifications (with retry logic)
    const registerPushNotifications = async () => {
      if (registrationAttempted.current) return;
      registrationAttempted.current = true;

      // Small delay to ensure app is fully ready
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        console.log("[NotificationProvider] Starting push notification registration for user:", userId);
        console.log("[NotificationProvider] Platform:", Platform.OS);

        const token = await notificationService.registerForPushNotifications(userId, supabase);
        if (token) {
          console.log("[NotificationProvider] ✅ Push notification token registered successfully");
        } else {
          console.warn("[NotificationProvider] ⚠️ Push notification registration returned no token");
          
          // Retry once after a delay on Android
          if (Platform.OS === "android") {
            console.log("[NotificationProvider] Retrying registration in 3 seconds...");
            setTimeout(async () => {
              try {
                const retryToken = await notificationService.registerForPushNotifications(userId, supabase);
                if (retryToken) {
                  console.log("[NotificationProvider] ✅ Retry successful! Token registered.");
                } else {
                  console.warn("[NotificationProvider] ❌ Retry also failed. Notifications may not work.");
                }
              } catch (retryError) {
                console.error("[NotificationProvider] Retry error:", retryError);
              }
            }, 3000);
          }
        }
      } catch (e) {
        console.error("[NotificationProvider] Registration failed:", e);
      }
    };

    registerPushNotifications();

    // 4. Global Navigation Handler
    const handleNavigation = (notification: Notification | any) => {
      const data = notification?.data || notification;
      const eventId = data?.event_id;
      
      if (!eventId) return;
      
      console.log("[NotificationProvider] Navigating to event details:", eventId);
      
      setTimeout(() => {
        router.push({ 
          pathname: "/event-details", 
          params: { id: eventId } 
        });
      }, 100);
    };

    // Foreground listener
    receivedListener.current = notificationService.addNotificationReceivedListener(
        (notification: any) => {
            console.log("[NotificationProvider] Foreground notification received");
            checkUnread();
        }
    );

    // Tap/Response listener
    responseListener.current = notificationService.addNotificationResponseReceivedListener(
      (response: any) => {
        const data = response?.notification?.request?.content?.data;
        if (data) {
          handleNavigation(data);
        }
      }
    );

    // Check if app was opened via notification
    notificationService.getLastNotificationResponse().then((response) => {
      if (response) {
        const data = response?.notification?.request?.content?.data;
        if (data) {
          handleNavigation(data);
        }
      }
    });

    // 5. Postgres Real-time Listener (Global)
    const channel = supabase
      .channel("global_notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          const newNotification = payload.new as Notification;
          notificationManager.setHasUnreadNotifications(true);
          notificationService.sendLocalNotification(
            newNotification.title,
            newNotification.body,
            newNotification.data
          );
          checkUnread();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          checkUnread();
        }
      )
      .subscribe();

    // 6. Cleanup
    return () => {
      appStateSubscription.remove();
      if (receivedListener.current) receivedListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
      supabase.removeChannel(channel);
      
      if (!isSignedIn) {
        notificationService.clearAllNotifications();
        notificationService.setBadgeCount(0);
      }
    };
  }, [userId, isSignedIn, supabase, router]);

  return <>{children}</>;
}
