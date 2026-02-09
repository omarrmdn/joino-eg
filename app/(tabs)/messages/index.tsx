import { useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useEffect, useMemo } from "react";
import {
    ActivityIndicator,
    FlatList,
    StatusBar,
    StyleSheet,
    Text,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MessageItem } from "../../../src/components/MessageItem";
import { Colors } from "../../../src/constants/Colors";
import { Fonts } from "../../../src/constants/Fonts";
import { useMessages } from "../../../src/hooks/useMessages";
import { useLanguage } from "../../../src/lib/i18n";

type ConversationMessage = {
  id: string;
  text: string;
  time: string;
  timestamp: string;
  fromMe?: boolean;
  link?: string | null;
  type?: string;
  subject?: string | null;
  unread?: boolean;
  eventTitle?: string;
};

type Conversation = {
  id: string;
  name: string;
  role: string;
  lastMessage: string;
  time: string;
  lastTimestamp: string;
  unread?: boolean;
  avatar: string | null;
  otherUserId: string;
  eventId: string;
  messages: ConversationMessage[];
};

// Helper to format time for conversation list (smart date)
// Helper to parse date string safely as UTC
const parseUTCDate = (dateString: string) => {
  if (!dateString) return new Date();
  let str = dateString;
  // Handle some DB formats like "2024-01-01 12:00:00"
  if (str.includes(' ') && !str.includes('T')) {
    str = str.replace(' ', 'T');
  }
  // Ensure UTC if no offset or Z is present
  if (!str.includes('Z') && !str.includes('+') && !/-\d{2}:?\d{2}$/.test(str)) {
    str += 'Z';
  }
  return new Date(str);
};

// Helper for chat bubbles (guaranteed local time by using manual getters)
const formatTimeForBubble = (dateString: string, t: (key: any) => string, locale: string = 'en') => {
  const date = parseUTCDate(dateString);
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = locale === 'ar' 
    ? (hours >= 12 ? 'م' : 'ص') 
    : (hours >= 12 ? 'PM' : 'AM');
  
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
  
  return `${displayHours}:${displayMinutes} ${ampm}`;
};

// Helper to format time for conversation list (smart relative date)
const formatTimeForList = (dateString: string, t: (key: any) => string, locale: string = 'en') => {
  const date = parseUTCDate(dateString);
  const now = new Date();
  
  // Today
  if (date.toDateString() === now.toDateString()) {
    return formatTimeForBubble(dateString, t, locale);
  }
  
  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return t("chat_yesterday");
  }
  
  // Last Week
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(now.getDate() - 7);
  if (date > oneWeekAgo) {
    return date.toLocaleDateString(locale, { weekday: 'short' });
  }
  
  // Older
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
};

export default function MessagesScreen() {
  const { user } = useUser();
  const { t, language } = useLanguage();
  const { messages, loading, sendMessage, markAsRead, markAllAsRead } = useMessages();
  const router = useRouter();

  useEffect(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  // Group messages into conversations
  const conversations = useMemo(() => {
    if (!user || !messages) return [];

    const groups: Record<string, Conversation> = {};

    messages.forEach((msg) => {
      const isFromMe = msg.sender_id === user.id;
      const otherUser = isFromMe ? msg.recipient : msg.sender;
      const otherUserId = isFromMe ? msg.recipient_id : msg.sender_id;
      const eventId = msg.event_id;
      const convId = `${otherUserId}_${eventId}`;

      if (!groups[convId]) {
        groups[convId] = {
          id: convId,
          name: otherUser?.name || t("chat_unknown_user"),
          role: msg.event?.title || t("chat_general_role"),
          lastMessage: msg.body,
          time: formatTimeForList(msg.created_at, t, language),
          lastTimestamp: msg.created_at,
          unread: !isFromMe && !msg.read,
          avatar: otherUser?.image_url || null,
          otherUserId,
          eventId,
          messages: [],
        };
      }

      // Update last message info if this message is newer
      if (msg.created_at > groups[convId].lastTimestamp) {
        groups[convId].lastMessage = msg.body;
        groups[convId].time = formatTimeForList(msg.created_at, t, language);
        groups[convId].lastTimestamp = msg.created_at;
      }

      groups[convId].messages.push({
        id: msg.id,
        text: msg.body,
        time: formatTimeForBubble(msg.created_at, t, language),
        timestamp: msg.created_at,
        fromMe: isFromMe,
        link: msg.event_link,
        type: msg.message_type,
        subject: msg.subject,
        eventTitle: msg.event?.title,
      });
    });

    // Sort messages in each conversation by timestamp (ascending - oldest first)
    Object.values(groups).forEach(conv => {
        conv.messages.sort((a, b) => a.timestamp.localeCompare(b.timestamp)); 
    });

    // Sort conversations by last message timestamp (descending - newest first)
    return Object.values(groups).sort((a, b) => {
        return b.lastTimestamp.localeCompare(a.lastTimestamp);
    });
  }, [messages, user, language]);


  const renderInbox = () => {
    if (loading) {
        return (
            <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (conversations.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t("messages_empty_title")}</Text>
          <Text style={styles.emptySubText}>{t("messages_empty_body")}</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageItem
            name={item.name}
            message={item.lastMessage}
            time={item.time}
            unread={item.unread}
            avatar={item.avatar || "https://via.placeholder.com/150?text=User"}
            onPress={() => {
              // Mark last message as read if unread
              const lastMsg = messages.find(m => 
                m.recipient_id === user?.id && 
                m.sender_id === item.otherUserId && 
                m.event_id === item.eventId && 
                !m.read
              );
              if (lastMsg) markAsRead(lastMsg.id);
              
              // Navigate to Chat
              router.push({ pathname: '/(tabs)/messages/chat/[id]', params: { id: item.id } });
            }}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" />
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t("messages_title")}</Text>
          </View>
          {renderInbox()}
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightblack,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: 28,
    fontFamily: Fonts.bold,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    color: Colors.white,
    fontSize: 18,
    fontFamily: Fonts.bold,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubText: {
    color: Colors.gray,
    fontSize: 14,
    fontFamily: Fonts.regular,
    textAlign: "center",
  },
});
