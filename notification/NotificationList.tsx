// components/NotificationList.tsx

import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Colors } from "../src/constants/Colors";
import { Fonts } from "../src/constants/Fonts";
import { useLanguage } from "../src/lib/i18n";
import type { Notification } from "./notifications";
import { useNotifications } from "./useNotifications";

// Format time as relative string
const formatTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
};

export function NotificationList() {
  const {
    notifications,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    handleNotificationTap,
  } = useNotifications();
  const { t } = useLanguage();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "new_attendee":
        return "🎉";
      case "attendee_cancel":
        return "❌";
      case "reminder_12hr":
      case "reminder_2hr":
        return "⏰";
      case "event_access":
        return "🔗";
      case "question":
        return "❓";
      case "new_event":
        return "📍";
      case "event_stats":
        return "📊";
      default:
        return "🔔";
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.read && styles.unread]}
      onPress={() => handleNotificationTap(item)}
      onLongPress={() => deleteNotification(item.id)}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{getNotificationIcon(item.type)}</Text>
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.body} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={styles.time}>{formatTimeAgo(item.created_at)}</Text>
      </View>

      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={{ color: Colors.white, marginTop: 10 }}>{t("notifications_loading")}</Text>
      </View>
    );
  }

  if (notifications.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>🔔</Text>
        <Text style={styles.emptySubtext}>{t("notifications_empty")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {notifications.some((n) => !n.read) && (
        <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
          <Text style={styles.markAllText}>Mark all as read</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  listContainer: {
    padding: 16,
  },
  notificationItem: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: Colors.lightblack,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  unread: {
    backgroundColor: "rgba(255, 50, 4, 0.05)",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.black,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: Fonts.semibold,
    color: Colors.white,
    marginBottom: 4,
  },
  body: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
    fontFamily: Fonts.regular,
  },
  time: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: Fonts.regular,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: 8,
  },
  markAllButton: {
    padding: 16,
    alignItems: "center",
    backgroundColor: Colors.lightblack,
  },
  markAllText: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
    color: Colors.primary,
  },
  emptyText: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: Fonts.regular,
  },
});
