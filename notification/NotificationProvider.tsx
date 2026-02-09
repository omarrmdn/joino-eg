// components/NotificationProvider.tsx

import { useAuth } from "@clerk/clerk-expo";
import { useEffect } from "react";
import { useSupabaseClient } from "../src/lib/supabaseConfig";
import notificationService from "./notificationService";

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, isSignedIn } = useAuth();
  const supabase = useSupabaseClient();

  useEffect(() => {
    if (!isSignedIn || !userId) return;

    // Register for push notifications
    const registerPushNotifications = async () => {
      const token =
        await notificationService.registerForPushNotifications(userId, supabase);
      if (token) {
        console.log("Push notification token registered:", token);
      }
    };

    registerPushNotifications();

    // Cleanup on logout
    return () => {
      if (!isSignedIn) {
        notificationService.clearAllNotifications();
        notificationService.setBadgeCount(0);
      }
    };
  }, [userId, isSignedIn]);

  return <>{children}</>;
}
