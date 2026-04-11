import { FontAwesome6, Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import React, { memo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Fonts";
import { ConversationMessage } from "../types/chat";

/** Detect if a URL is a Google Maps location link (onsite event) */
function isLocationLink(url?: string | null): boolean {
  if (!url) return false;
  return (
    url.includes("maps.google.com") ||
    url.includes("google.com/maps") ||
    url.includes("maps.apple.com") ||
    url.startsWith("geo:")
  );
}

/** Extract human-readable location name from a Google Maps search URL */
function extractLocationName(url: string): string {
  try {
    // google.com/maps/search/?api=1&query=Cairo%2C+Egypt
    const match = url.match(/[?&]query=([^&]+)/);
    if (match) return decodeURIComponent(match[1].replace(/\+/g, " "));
    // geo:lat,lng?q=...
    const geoMatch = url.match(/[?&]q=([^&]+)/);
    if (geoMatch) return decodeURIComponent(geoMatch[1].replace(/\+/g, " "));
  } catch (_) {}
  return url;
}

const MessageBubble = memo(({ item }: { item: ConversationMessage }) => {
  const isMe = item.fromMe;
  const isLink = item.type === "event_link";
  const isLocation = isLink && isLocationLink(item.link);

  const subjectText = item.subject?.trim() || "";
  const isNewQuestionSubject =
    subjectText.toLowerCase() === "new question" || subjectText === "سؤال جديد";
  const displaySubject =
    isNewQuestionSubject && item.eventTitle ? item.eventTitle : item.subject;

  // ─── Location Card (WhatsApp-style) ──────────────────────────────────────
  if (isLocation) {
    const locationName = extractLocationName(item.link!);
    return (
      <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.locationCard}
          onPress={() => item.link && Linking.openURL(item.link)}
        >
          {/* Map preview strip */}
          <View style={styles.mapStrip}>
            <View style={styles.mapBg}>
              {/* Grid lines to mimic a map */}
              <View style={styles.mapGridH1} />
              <View style={styles.mapGridH2} />
              <View style={styles.mapGridV1} />
              <View style={styles.mapGridV2} />
            </View>
            {/* Pin */}
            <View style={styles.pinWrapper}>
              <View style={styles.pinCircle}>
                <FontAwesome6 name="location-dot" size={22} color={Colors.primary} />
              </View>
            </View>
          </View>

          {/* Bottom info row */}
          <View style={styles.locationInfo}>
            <View style={styles.locationTextCol}>
              <Text style={styles.locationLabel} numberOfLines={1}>
                📍 {locationName}
              </Text>
              <Text style={styles.openMapsText}>Tap to open in Maps</Text>
            </View>
            <MaterialIcons name="open-in-new" size={18} color={Colors.primary} />
          </View>

          <Text style={[styles.messageTime, { paddingHorizontal: 12, paddingBottom: 8 }]}>
            {item.time}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Online Link Card ─────────────────────────────────────────────────────
  if (isLink) {
    return (
      <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}>
        <View style={[styles.messageBubble, styles.linkBubble]}>
          <View style={styles.linkContent}>
            <View style={styles.linkHeaderRow}>
              <Ionicons name="link" size={18} color={Colors.lighterGray} />
              <Text style={styles.linkTitle} numberOfLines={1}>
                {item.subject || `Link to ${item.eventTitle || "Event"}`}
              </Text>
            </View>
            <Text
              style={styles.linkUrl}
              numberOfLines={2}
              onPress={() => item.link && Linking.openURL(item.link)}
            >
              {item.link?.includes("query=")
                ? decodeURIComponent(item.link.split("query=")[1].split("&")[0])
                : item.link}
            </Text>
            <Text style={styles.messageTime}>{item.time}</Text>
          </View>
        </View>
      </View>
    );
  }

  // ─── Regular Text Bubble ──────────────────────────────────────────────────
  return (
    <View
      style={[
        styles.messageRow,
        isMe ? styles.messageRowMe : styles.messageRowOther,
      ]}
    >
      {!!displaySubject && item.type === "general" && (
        <View
          style={[
            styles.subjectPill,
            isMe ? styles.subjectPillMe : styles.subjectPillOther,
          ]}
        >
          <Text style={styles.subjectText} numberOfLines={1}>
            {displaySubject}
          </Text>
        </View>
      )}
      <View
        style={[
          styles.messageBubble,
          isMe ? styles.messageBubbleMe : styles.messageBubbleOther,
        ]}
      >
        <Text style={[styles.messageText, isMe && styles.messageTextMe]}>
          {item.text}
        </Text>
        <Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>
          {item.time}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  messageRow: {
    marginBottom: 16,
    flexDirection: "column",
    alignItems: "flex-start",
  },
  messageRowMe: {
    alignItems: "flex-end",
  },
  messageRowOther: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: "75%",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageBubbleMe: {
    backgroundColor: Colors.white,
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: Colors.lightblack,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: Fonts.regular,
    lineHeight: 24,
  },
  messageTextMe: {
    color: Colors.black,
  },
  messageTime: {
    alignSelf: "flex-end",
    color: Colors.whiteTransparentHigh,
    fontSize: 10,
    fontFamily: Fonts.regular,
    marginTop: 4,
  },
  messageTimeMe: {
    color: Colors.blackTransparentMedium,
  },
  subjectPill: {
    maxWidth: "75%",
    backgroundColor: Colors.darkflame,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 6,
  },
  subjectPillMe: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 6,
  },
  subjectPillOther: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: 6,
  },
  subjectText: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: Fonts.medium,
    fontStyle: "italic",
  },

  // ── Link Bubble ──────────────────────────────────────────────────────────
  linkBubble: {
    backgroundColor: Colors.linkBubbleBackground,
    borderBottomLeftRadius: 4,
    borderRadius: 16,
    padding: 16,
    minWidth: 200,
    maxWidth: "75%",
  },
  linkContent: {
    marginTop: 0,
  },
  linkHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  linkTitle: {
    color: Colors.white,
    fontSize: 14,
    fontFamily: Fonts.medium,
    marginLeft: 8,
    flex: 1,
  },
  linkUrl: {
    color: Colors.linkText,
    fontSize: 13,
    fontFamily: Fonts.regular,
    textDecorationLine: "underline",
  },

  // ── Location Card ────────────────────────────────────────────────────────
  locationCard: {
    width: 240,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  mapStrip: {
    height: 110,
    backgroundColor: "#1C2B1C",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  mapBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#1E2E1E",
  },
  // Subtle grid lines to mimic a map
  mapGridH1: {
    position: "absolute",
    top: "35%",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  mapGridH2: {
    position: "absolute",
    top: "65%",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  mapGridV1: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "33%",
    width: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  mapGridV2: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "66%",
    width: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  pinWrapper: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  pinCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,50,4,0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,50,4,0.35)",
  },
  locationInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 8,
  },
  locationTextCol: {
    flex: 1,
  },
  locationLabel: {
    color: Colors.white,
    fontSize: 13,
    fontFamily: Fonts.medium,
    marginBottom: 2,
  },
  openMapsText: {
    color: Colors.primary,
    fontSize: 11,
    fontFamily: Fonts.regular,
  },
});

export default MessageBubble;
