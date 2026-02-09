import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Fonts";
import { ConversationMessage } from "../types/chat";

const MessageBubble = memo(({ item }: { item: ConversationMessage }) => {
  const isMe = item.fromMe;
  // TODO: Check if type 'event_link' is correct based on DB
  const isLink = item.type === 'event_link';

  if (isLink) {
      return (
          <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}>
               <View style={[styles.messageBubble, styles.linkBubble]}>
                  <View style={styles.linkContent}>
                      <View style={styles.linkHeaderRow}>
                          <Ionicons name="link" size={18} color={Colors.lighterGray} />
                          <Text style={styles.linkTitle} numberOfLines={1}>
                              {item.subject || `Link to ${item.eventTitle || 'Event'}`}
                          </Text>
                      </View>
                      <Text 
                          style={styles.linkUrl} 
                          numberOfLines={1}
                          onPress={() => item.link && Linking.openURL(item.link)}
                      >
                          {item.link}
                      </Text>
                      <Text style={styles.messageTime}>{item.time}</Text>
                  </View>
               </View>
          </View>
      );
  }

  return (
    <View
      style={[
        styles.messageRow,
        isMe ? styles.messageRowMe : styles.messageRowOther,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          isMe ? styles.messageBubbleMe : styles.messageBubbleOther,
        ]}
      >
        <Text style={styles.messageText}>{item.text}</Text>
        <Text style={styles.messageTime}>{item.time}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  messageRow: {
    marginBottom: 16,
    flexDirection: "row",
    alignItems: 'flex-end',
  },
  messageRowMe: {
    justifyContent: "flex-end",
  },
  messageRowOther: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageBubbleMe: {
    backgroundColor: Colors.primary,
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
  messageTime: {
    alignSelf: "flex-end",
    color: Colors.whiteTransparentHigh,
    fontSize: 10,
    fontFamily: Fonts.regular,
    marginTop: 4,
  },
  // Link Bubble Styles
  linkBubble: {
    backgroundColor: Colors.linkBubbleBackground,
    borderBottomLeftRadius: 4,
    borderRadius: 16,
    padding: 16,
    minWidth: 200,
  },
  linkContent: {
      marginTop: 0,
  },
  linkHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
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
      textDecorationLine: 'underline',
  },
});

export default MessageBubble;

