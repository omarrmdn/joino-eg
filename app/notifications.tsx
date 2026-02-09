import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Notification } from "../notification/notifications";
import { useNotifications } from "../notification/useNotifications";
import { Colors } from "../src/constants/Colors";
import { Fonts } from "../src/constants/Fonts";
import { notificationManager } from "../src/lib/NotificationManager";
import { useLanguage } from "../src/lib/i18n";

// Format time as relative string (e.g., "2 hours ago", "1 day ago")
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

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, loading, handleNotificationTap, refetch, markAllAsRead } = useNotifications();
  const { t, language } = useLanguage();
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    markAllAsRead();
    notificationManager.setHasUnreadNotifications(false);
  }, [markAllAsRead]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const getNotificationIcon = (type: string): string => {
    switch (type) {
      case "new_attendee":
        return "people-outline";
      case "attendee_cancel":
        return "close-circle-outline";
      case "reminder_12hr":
      case "reminder_2hr":
        return "alarm-outline";
      case "question":
        return "help-circle-outline";
      case "new_event":
        return "location-outline";
      case "event_stats":
        return "bar-chart-outline";
      default:
        return "notifications-outline";
    }
  };

  const renderItem = ({ item }: { item: Notification }) => {
    const iconName = getNotificationIcon(item.type);
    const timeAgo = formatTimeAgo(item.created_at);

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          !item.read && styles.unreadNotification,
        ]}
        onPress={() => handleNotificationTap(item)}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={iconName as any} size={24} color={Colors.primary} />
        </View>
        <View style={styles.textContainer}>
          <View style={styles.row}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.time}>{timeAgo}</Text>
          </View>
          <Text style={styles.message} numberOfLines={2}>
            {item.body}
          </Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons
              name={language === "ar" ? "chevron-forward" : "chevron-back"}
              size={28}
              color={Colors.white}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("notifications_title")}</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons
            name={language === "ar" ? "chevron-forward" : "chevron-back"}
            size={28}
            color={Colors.white}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("notifications_title")}</Text>
        <View style={{ width: 28 }} />
      </View>

      {notifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons
            name="notifications-off-outline"
            size={64}
            color={Colors.textSecondary}
          />
          <Text style={styles.emptyText}>{t("notifications_empty")}</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightblack,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: 20,
    fontFamily: Fonts.bold,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  notificationItem: {
    flexDirection: "row",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightblack,
    alignItems: "center",
  },
  unreadNotification: {
    backgroundColor: "rgba(255, 50, 4, 0.05)",
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.lightblack,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  textContainer: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: Fonts.semibold,
    flex: 1,
  },
  time: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginLeft: 8,
  },
  message: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: Fonts.regular,
    lineHeight: 20,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: 10,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyText: {
    color: Colors.white,
    fontSize: 18,
    fontFamily: Fonts.semibold,
    marginTop: 16,
  },
  emptySubtext: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: Fonts.regular,
    marginTop: 8,
    textAlign: "center",
  },
});
