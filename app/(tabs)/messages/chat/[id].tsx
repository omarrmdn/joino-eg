import MessageBubble from "@/src/components/MessageDetailBubble";
import { Colors } from "@/src/constants/Colors";
import { Fonts } from "@/src/constants/Fonts";
import { DBMessage, useMessages } from "@/src/hooks/useMessages";
import { useLanguage } from "@/src/lib/i18n";
import { Conversation, ConversationMessage } from "@/src/types/chat";
import { formatTimeForBubble } from "@/src/utils/date";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ChatScreen() {
  const { user } = useUser();
  const { t, language } = useLanguage();
  const { messages, loading, sendMessage, markAsRead } = useMessages();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);

  const selectedConversationId = Array.isArray(id) ? id[0] : id;

  const conversations = useMemo(() => {
    if (!user || !messages) return [];

    const groups: Record<string, Conversation> = {};

    messages.forEach((msg: DBMessage) => {
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
            time: "", 
            lastTimestamp: msg.created_at,
            avatar: otherUser?.image_url || null,
            otherUserId,
            eventId,
            messages: [],
        };
      }

      // Update last message
      if (msg.created_at > groups[convId].lastTimestamp) {
          groups[convId].lastTimestamp = msg.created_at;
      }

      groups[convId].messages.push({
        id: msg.id,
        text: msg.body,
        time: formatTimeForBubble(msg.created_at, language),
        timestamp: msg.created_at,
        fromMe: isFromMe,
        link: msg.event_link,
        type: msg.message_type,
        subject: msg.subject,
        unread: !isFromMe && !msg.read,
        eventTitle: msg.event?.title,
      });
    });
    
    // Sort messages in each conversation
    Object.values(groups).forEach(conv => {
        conv.messages.sort((a, b) => a.timestamp.localeCompare(b.timestamp)); 
    });

    return Object.values(groups);
  }, [messages, user, language]);

  const selectedConversation = useMemo(() => 
    conversations.find(c => c.id === selectedConversationId), 
    [conversations, selectedConversationId]
  );

  // Mark messages as read when they appear in the active chat
  React.useEffect(() => {
    if (selectedConversation && user) {
        selectedConversation.messages.forEach(msg => {
            if (msg.unread && msg.id) {
                markAsRead(msg.id);
            }
        });
    }
  }, [selectedConversation, user, markAsRead]);

  const flatListRef = useRef<FlatList>(null);

  const scrollToBottom = (animated = true) => {
    if (flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated });
      }, 100);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || !selectedConversation || !user) return;

    setIsSending(true);
    try {
        await sendMessage({
            body: inputValue.trim(),
            recipient_id: selectedConversation.otherUserId,
            event_id: selectedConversation.eventId,
            message_type: 'general',
        });
        setInputValue("");
        scrollToBottom();
    } catch (err) {
        console.error("Failed to send message:", err);
    } finally {
        setIsSending(false);
    }
  };

  const renderItem = useCallback(({ item }: { item: ConversationMessage }) => (
    <MessageBubble item={item} />
  ), []);

  const onBackPress = () => router.back();

  if (!selectedConversation) return (
      <View style={[styles.container, styles.center]}>
          <ActivityIndicator size="large" color={Colors.primary} />
      </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" />
      {/* Custom Header matching design */}
      <View style={styles.customChatHeader}>
          <TouchableOpacity
            onPress={onBackPress}
            style={styles.backButton}
          >
             <Ionicons name={language === 'ar' ? "chevron-forward" : "chevron-back"} size={28} color={Colors.white} />
          </TouchableOpacity>
          
          <View style={styles.headerProfileContainer}>
             <Image 
                source={{ uri: selectedConversation.avatar || "https://via.placeholder.com/150" }} 
                style={styles.headerAvatar} 
             />
             <View style={styles.headerTextContainer}>
                <Text style={styles.headerProfileName} numberOfLines={1}>
                    {selectedConversation.name}
                </Text>
                <Text style={styles.headerProfileRole} numberOfLines={1}>
                    {t("chat_organizer_of")} {selectedConversation.role}
                </Text>
             </View>
          </View>
        </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0} 
      >

        <FlatList
          ref={flatListRef}
          data={selectedConversation.messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={Platform.OS === 'android'}
          contentContainerStyle={styles.chatMessages}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollToBottom()}
          onLayout={() => scrollToBottom(false)}
        />

        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.inputIconButton}>
            <Ionicons name="add" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder={t("chat_type_message")}
            placeholderTextColor={Colors.textSecondary}
            value={inputValue}
            onChangeText={setInputValue}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputValue.trim() || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputValue.trim() || isSending}
          >
            {isSending ? (
                <ActivityIndicator size="small" color={Colors.white} />
            ) : (
                <Ionicons name="send" size={18} color={Colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  customChatHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: Colors.black,
      borderBottomWidth: 1,
      borderBottomColor: Colors.borderDark,
  },
  backButton: {
      padding: 4,
      marginRight: 8,
     
  },
  headerProfileContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
  },
  headerAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: Colors.lightblack,
      marginRight: 12,
  },
  headerTextContainer: {
      flex: 1,
      justifyContent: 'center',
  },
  headerProfileName: {
      color: Colors.white,
      fontSize: 16,
      fontFamily: Fonts.bold,
      marginBottom: 2,
  },
  headerProfileRole: {
      color: Colors.textSecondary,
      fontSize: 12,
      fontFamily: Fonts.medium,
  },
  chatMessages: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderDark,
    backgroundColor: Colors.black,
  },
  inputIconButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.inputBackground,
    color: Colors.white,
    fontFamily: Fonts.regular,
    fontSize: 15,
    marginHorizontal: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: Colors.buttonDisabled,
  },
});
