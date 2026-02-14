// hooks/useNotifications.ts

import { useAuth } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTrackSession } from "../src/hooks/useTrackSession";
import { notificationManager } from "../src/lib/NotificationManager";
import { useSupabaseClient } from "../src/lib/supabaseConfig";
import notificationService from "./notificationService";
import type { Notification, NotificationPreferences } from "./notifications";

export function useNotifications() {
  const { userId } = useAuth();
  const supabase = useSupabaseClient();
  const { trackAction } = useTrackSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);

  // Fetch notifications from database
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    try {
      // FIXED: Explicitly cast to text to prevent UUID casting
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)  // No casting - let Supabase handle it as text
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching notifications:", error);
        throw error;
      }

      console.log(`Fetched ${data?.length || 0} notifications for user ${userId}`);
      setNotifications(data || []);
      const unread = data?.filter((n) => !n.read).length || 0;
      setUnreadCount(unread);
      notificationManager.setHasUnreadNotifications(unread > 0);

      // Update badge count
      await notificationService.setBadgeCount(unread);
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
      // Don't throw - just set loading to false
    } finally {
      setLoading(false);
    }
  }, [userId, supabase]);

  // Fetch user preferences
  const fetchPreferences = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching preferences:", error);
        throw error;
      }

      setPreferences(data);
    } catch (error) {
      console.error("Error fetching preferences:", error);
    }
  }, [userId, supabase]);

  // Mark notification as read
  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!userId) return;

      try {
        const { error } = await supabase
          .from("notifications")
          .update({ read: true })
          .eq("id", notificationId)
          .eq("user_id", userId);

        if (error) throw error;

        // Update local state
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));

        // Update badge
        await notificationService.setBadgeCount(Math.max(0, unreadCount - 1));

        const notification = notifications.find((n) => n.id === notificationId);
        trackAction("notification_read", {
          notificationId,
          notificationType: notification?.type,
          eventId: notification?.data?.event_id,
        });
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    },
    [userId, unreadCount, supabase, notifications, trackAction],
  );

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("read", false);

      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      await notificationService.setBadgeCount(0);
      trackAction("notification_read", { all: true });
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  }, [userId, supabase, trackAction]);

  // Delete notification
  const deleteNotification = useCallback(
    async (notificationId: string) => {
      if (!userId) return;

      try {
        const { error } = await supabase
          .from("notifications")
          .delete()
          .eq("id", notificationId)
          .eq("user_id", userId);

        if (error) throw error;

        const wasUnread =
          notifications.find((n) => n.id === notificationId)?.read === false;

        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

        if (wasUnread) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
          await notificationService.setBadgeCount(Math.max(0, unreadCount - 1));
        }
      } catch (error) {
        console.error("Error deleting notification:", error);
      }
    },
    [userId, notifications, unreadCount, supabase],
  );

  // Update preferences
  const updatePreferences = useCallback(
    async (updates: Partial<NotificationPreferences>) => {
      if (!userId) return;

      try {
        const { error } = await supabase
          .from("notification_preferences")
          .update(updates)
          .eq("user_id", userId);

        if (error) throw error;

        setPreferences((prev) => (prev ? { ...prev, ...updates } : null));
      } catch (error) {
        console.error("Error updating preferences:", error);
      }
    },
    [userId, supabase],
  );

  // Handle notification tap
  const handleNotificationTap = useCallback(
    (notification: Notification) => {
      // Mark as read
      markAsRead(notification.id);

      // Navigate based on notification type
      const { type, data } = notification;

      switch (type) {
        case "new_attendee":
        case "attendee_cancel":
        case "event_stats":
        case "reminder_12hr":
        case "reminder_2hr":
        case "new_event":
        case "event_access":
        case "recommendation":
        case "event_update":
          if (data.event_id) {
            router.push({ pathname: "/event-details", params: { id: data.event_id } });
          }
          break;

        case "question":
        case "message":
          if (data.event_id) {
            router.push({ pathname: "/event-details", params: { id: data.event_id } });
          } else {
            router.push("/(tabs)/messages");
          }
          break;
      }
    },
    [markAsRead],
  );

  // Subscribe to real-time notifications (list update only)
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("notifications_list_update")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as Notification;
          setNotifications((prev) => prev.map(n => n.id === updated.id ? updated : n));
          // Recalculate unread locally
          setNotifications(prev => {
            const unread = prev.filter(n => !n.read).length;
            setUnreadCount(unread);
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  // Initial fetch
  useEffect(() => {
    if (userId) {
      fetchNotifications();
      fetchPreferences();
    }
  }, [userId, fetchNotifications, fetchPreferences]);

  return {
    notifications,
    unreadCount,
    loading,
    preferences,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updatePreferences,
    handleNotificationTap,
    refetch: fetchNotifications,
  };
}
