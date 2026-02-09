import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
    FadeInRight,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Fonts";
import { useAlert } from "../lib/AlertContext";
import { useLanguage } from "../lib/i18n";
import { EventCardData } from "../types/database";
import { getRecurringLabel } from "../utils/recurrence";

interface SearchResultProps {
  event: EventCardData;
  index?: number;
  onRefresh?: () => void;
}

export const SearchResult = React.memo(({ event, index = 0, onRefresh }: SearchResultProps) => {
  const router = useRouter();
  const { showAlert } = useAlert();
  const { t, language } = useLanguage();
  const recurringLabel = getRecurringLabel(
    event.isRecurring,
    event.recurrencePattern,
    event.recurrenceDays,
    language,
  );
  const dateLabel = recurringLabel || event.day;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    router.push({
      pathname: "/event-details",
      params: { id: event.id },
    });
  };

  const handleOptions = (e: any) => {
    e.stopPropagation();
    if (event.isAttending) {
      showAlert({
        title: t("event_cancel_attendance"),
        message: t("settings_sign_out_confirm_message"), // Needs a better key
        type: 'warning',
        buttons: [
          { text: t("btn_cancel"), style: "cancel" },
          { 
            text: t("btn_yes_cancel"), 
            style: "destructive",
            onPress: async () => {
              // Note: We need supabase here. For simplicity, we can pass a prop or use a hook.
              // But easiest is to just navigate to details where they can cancel with full loading state.
              // Re-thinking: User asked to "add cancel attending option".
              router.push({
                pathname: "/event-details",
                params: { id: event.id, autoCancel: "true" },
              });
            }
          }
        ]
      });
    }
  };

  return (
    <Animated.View
      entering={FadeInRight.delay(index * 100).springify()}
    >
      <Animated.View style={animatedStyle}>
        <Pressable
          style={[
            styles.container,
            event.status === 'canceled' && styles.canceledContainer
          ]}
          onPressIn={() => (scale.value = withSpring(0.98))}
          onPressOut={() => (scale.value = withSpring(1))}
          onPress={handlePress}
        >
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: event.image }}
              style={styles.image}
              contentFit="cover"
            />
            {event.status === 'canceled' && (
              <View style={styles.canceledOverlay} />
            )}
          </View>

          <View style={[styles.content, event.status === 'canceled' && { opacity: 0.6 }]}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1}>
                {event.title}
              </Text>
              {event.isAttending && (
                <Pressable onPress={handleOptions} style={styles.optionsButton}>
                  <Ionicons name="ellipsis-vertical" size={18} color={Colors.gray} />
                </Pressable>
              )}
            </View>

            <View style={styles.combinedInfoRow}>
              <View style={styles.infoItem}>
                <Ionicons name="location-sharp" size={14} color={Colors.primary} />
                <Text style={styles.infoText} numberOfLines={1}>
                  {event.location}
                </Text>
              </View>

              <View style={styles.infoItem}>
                <Ionicons name="calendar-sharp" size={14} color={Colors.primary} />
                <Text style={styles.infoText} numberOfLines={1}>
                  {dateLabel} - {event.time}
                </Text>
              </View>
            </View>

            <View style={styles.footerRow}>
              <Text style={styles.price}>{event.price}</Text>
              {event.status === 'canceled' ? (
                <View style={[styles.statusBadge, styles.canceledBadge]}>
                  <Ionicons name="close-circle" size={12} color={Colors.error} style={{ marginRight: 4 }} />
                  <Text style={styles.canceledBadgeText}>{t("event_canceled")}</Text>
                </View>
              ) : event.isAttending && (
                <View style={styles.attendingBadge}>
                  <TouchableOpacity onPress={handleOptions} style={{ marginRight: 4 }}>
                    <Ionicons name="close-circle" size={14} color={Colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.attendingBadgeText}>{t("event_attending_status")}</Text>
                </View>
              )}
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "transparent",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.whiteTransparentVeryLight,
    alignItems: 'center',
  },
  canceledContainer: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 15,
    borderBottomWidth: 0,
  },
  imageWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 15,
    backgroundColor: Colors.lightblack,
  },
  canceledOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)', // Slightly dim the image
    borderRadius: 15,
  },
  content: {
    flex: 1,
    marginLeft: 15,
    height: 100, // Match the image height exactly
    justifyContent: "space-between", // Spread rows evenly within that height
    paddingVertical: 2,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    flex: 1,
    color: Colors.white,
    fontSize: 17, // Slightly smaller to prevent wrapping
    fontFamily: Fonts.bold,
  },
  optionsButton: {
    padding: 2,
  },
  combinedInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  infoText: {
    color: Colors.textSecondary,
    fontSize: 12, // Slightly smaller
    fontFamily: Fonts.medium,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  price: {
    color: Colors.white,
    fontSize: 15, // Slightly smaller
    fontFamily: Fonts.bold,
  },
  attendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryTransparentDark,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.primaryTransparent,
  },
  attendingBadgeText: {
    color: Colors.primary,
    fontSize: 10,
    fontFamily: Fonts.bold,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  canceledBadge: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderColor: 'rgba(255, 59, 48, 0.2)',
  },
  canceledBadgeText: {
    color: Colors.error,
    fontSize: 11,
    fontFamily: Fonts.bold,
  },
});
