import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';

interface MessageItemProps {
  name: string;
  message: string;
  time: string;
  avatar: string;
  unread?: boolean;
  onPress?: () => void;
}

export const MessageItem = ({
  name,
  message,
  time,
  avatar,
  unread,
  onPress,
}: MessageItemProps) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: avatar }}
        style={styles.avatar}
        contentFit="cover"
      />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.time}>{time}</Text>
        </View>
        <View style={styles.footer}>
          <Text style={[styles.message, unread && styles.messageUnread]} numberOfLines={1}>
            {message}
          </Text>
          {unread && <View style={styles.unreadDot} />}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.lightblack,
  },
  content: {
    flex: 1,
    marginLeft: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    color: Colors.white,
    fontSize: 18,
    fontFamily: Fonts.semibold,
  },
  time: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  message: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: Fonts.regular,
    flex: 1,
    marginRight: 10,
  },
  messageUnread: {
    color: Colors.white,
    fontFamily: Fonts.medium,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
});
