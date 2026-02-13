// components/NotificationProvider.tsx

import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
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
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!isSignedIn || !userId) {
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
      supabase.removeChannel(channel);
      
      if (!isSignedIn) {
        notificationService.clearAllNotifications();
        notificationService.setBadgeCount(0);
      }
    };
  }, [userId, isSignedIn, supabase, router]);

  return <>{children}</>;
}
