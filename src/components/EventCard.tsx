import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";
import { Colors } from "../constants/Colors";
import { PROMOTIONS_ENABLED } from "../constants/FeatureFlags";
import { Fonts } from "../constants/Fonts";
import { useTrackSession } from "../hooks/useTrackSession";
import { useLanguage } from "../lib/i18n";
import { EventCardData } from "../types/database";
import { getRecurringLabel } from "../utils/recurrence";
import { shareEvent } from "../utils/shareEvent";

interface EventCardProps {
  event: EventCardData;
  index?: number;
}

export const EventCard = React.memo(({ event, index = 0 }: EventCardProps) => {
  const router = useRouter();
  const { trackAction } = useTrackSession();
  const { language } = useLanguage();
  const recurringLabel = getRecurringLabel(
    event.isRecurring,
    event.recurrencePattern,
    event.recurrenceDays,
    language,
  );
  const dateLabel = recurringLabel || event.day;
  const isPromoted = PROMOTIONS_ENABLED && !!event.isPromoted;

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const handlePress = () => {
    trackAction("view_event", { eventId: event.id, title: event.title });
    router.push({
      pathname: "/event-details",
      params: { id: event.id },
    });
  };

  const handleShare = async (e: any) => {
    // Prevent event card from being pressed when share is clicked
    e.stopPropagation();
    
    trackAction("share_event_card", { eventId: event.id, title: event.title });
    
    await shareEvent({
      id: event.id,
      title: event.title,
      date: event.rawDate || event.day,
      is_online: event.isOnline,
      location: event.location,
    });
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).springify()}
    >
      <Animated.View style={animatedStyle}>
        <Pressable
          style={[styles.container, isPromoted && styles.promotedContainer]}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
        >
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: event.image }}
              style={styles.image}
              contentFit="cover"
            />
            
            {/* Share Button Overlay */}
            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShare}
              activeOpacity={0.8}
            >
              <Ionicons name="share-outline" size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {isPromoted && (
              <View style={styles.promotedRow}>
                <Ionicons name="information-circle" size={16} color={Colors.gray} />
                <Text style={styles.promotedLabel}>promoted</Text>
              </View>
            )}
            <Text style={styles.title}>{event.title}</Text>

            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Ionicons
                  name="location-sharp"
                  size={18}
                  color={Colors.primary}
                />
                <Text
                  style={[styles.infoText, styles.locationText]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {event.location}
                </Text>
              </View>

              <View style={styles.infoItem}>
                <Ionicons
                  name="calendar-sharp"
                  size={18}
                  color={Colors.primary}
                />
                <Text style={styles.infoText} numberOfLines={1}>
                  {dateLabel} - {event.time}
                </Text>
              </View>
            </View>

            <View style={styles.footerRow}>
              <Text style={styles.price}>{event.price}</Text>

              <View style={styles.avatarPile}>
                {event.attendingCount > 0 && (
                  <Text style={styles.attendingCount}>
                    +{event.attendingCount}
                  </Text>
                )}
                {event.attendingAvatars.map((avatarSource, index) => {
                  const isUrl = avatarSource.startsWith("http") || avatarSource.startsWith("data:");
                  return isUrl ? (
                    <Image
                      key={index}
                      source={{ uri: avatarSource }}
                      style={[
                        styles.avatar,
                        {
                          marginLeft: index === 0 ? 8 : -15,
                          backgroundColor: Colors.lightblack,
                        },
                      ]}
                      contentFit="cover"
                    />
                  ) : (
                    <View
                      key={index}
                      style={[
                        styles.avatar,
                        {
                          backgroundColor: avatarSource,
                          marginLeft: index === 0 ? 8 : -15,
                        },
                      ]}
                    />
                  );
                })}
              </View>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: "transparent",
    marginBottom: 24,
    width: "100%",
    borderColor: Colors.gray,
    borderWidth: 0,
  },
  promotedContainer: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 10,
    padding: 6,
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: 150,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    
  },
  shareButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: Colors.blackTransparent,
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingTop: 10,
    gap: 10,
  },
  promotedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  promotedLabel: {
    color: Colors.gray,
    fontSize: 12,
    fontFamily: Fonts.medium,
    textTransform: "lowercase",
    letterSpacing: 0.4,
  },
  title: {
    color: Colors.white,
    fontSize: 20,
    fontFamily: Fonts.semibold,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  infoText: {
    color: Colors.white,
    fontSize: 14,
    marginLeft: 6,
    fontFamily: Fonts.medium,
  },
  locationText: {
    width: "45%",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  price: {
    color: Colors.white,
    fontSize: 18,
    fontFamily: Fonts.semibold,
  },
  avatarPile: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  attendingCount: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: Fonts.semibold,
    marginLeft: 8,
  },
});
