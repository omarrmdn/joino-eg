import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Fonts";
import { useTrackSession } from "../hooks/useTrackSession";
import { useLanguage } from "../lib/i18n";
import { getRecurringLabel } from "../utils/recurrence";

interface CompactEventCardProps {
  event: any;
  index?: number;
}

export const CompactEventCard = React.memo(({ event, index = 0 }: CompactEventCardProps) => {
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
    trackAction("view_event_compact", { eventId: event.id, title: event.title });
    router.push({
      pathname: "/event-details",
      params: { id: event.id },
    });
  };

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Pressable
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
          <View style={styles.priceTag}>
            <Text style={styles.priceText}>{event.price}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>{event.title}</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="location-sharp" size={14} color={Colors.primary} />
            <Text style={styles.infoText} numberOfLines={1}>{event.location}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
            <Text style={styles.infoText} numberOfLines={1}>
              {dateLabel} - {event.time}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: 260,
    backgroundColor: Colors.lightblack,
    borderRadius: 12,
    marginRight: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.whiteTransparentVeryLight,
  },
  imageContainer: {
    width: '100%',
    height: 110,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  priceTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.blackTransparentMedium,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.whiteTransparentMedium,
  },
  priceText: {
    color: Colors.white,
    fontSize: 12,
    fontFamily: Fonts.semibold,
  },
  content: {
    padding: 10,
    gap: 4,
  },
  title: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: Fonts.semibold,
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: Fonts.medium,
    flex: 1,
  },
});
