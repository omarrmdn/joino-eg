import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Fonts";
import { useAnimatedSearchPlaceholder } from "../hooks/useAnimatedSearchPlaceholder";
import { useNotifications } from "../hooks/useNotifications";
import { useLanguage } from "../lib/i18n";
import TopbarLogo from "./topbarLogo";

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (text: string) => void;
  onLocationPress: () => void;
  refreshToken?: number;
}

export const TopBar = React.memo(({ searchQuery, onSearchChange: _onSearchChange, onLocationPress, refreshToken }: TopBarProps) => {
  const router = useRouter();
  const { language } = useLanguage();
  const isRtl = language === "ar" || language === "ar-EG";
  
  const { hasUnreadNotifications, hasUnreadMessages, hasUnreadEvents } = useNotifications();
  const hasAnythingNew = hasUnreadNotifications || hasUnreadMessages || hasUnreadEvents;

  const isEmptyQuery =
    searchQuery.replace(/[\u200E\u200F\u061C]/g, "").trim().length === 0;
  
  const animatedPlaceholder = useAnimatedSearchPlaceholder({
    active: isEmptyQuery,
    refreshToken,
  });
  
  const displayValue = isEmptyQuery ? animatedPlaceholder : searchQuery;

  const barStyle = [
    styles.searchBarInner, 
    { flexDirection: isRtl ? "row-reverse" : "row" } as any
  ];

  const textStyle = [
    styles.input,
    isEmptyQuery && styles.placeholderText,
    { 
      textAlign: isRtl ? "right" : "left",
      writingDirection: isRtl ? "rtl" : "ltr" 
    } as any
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TopbarLogo style={styles.logo}/>
        <TouchableOpacity onPress={() => router.push('/notifications' as any)}>
          <View>
            <Ionicons name="notifications-outline" size={28} color={Colors.white} />
            {hasAnythingNew && <View style={[styles.notificationBubble, { top: 2, right: 2 }]} />}
          </View>
        </TouchableOpacity>
      </View>
      <TouchableOpacity 
        activeOpacity={0.9} 
        style={styles.searchContainer} 
        onPress={() => router.push('/search' as any)}
      >
        <View style={barStyle}>
          <Ionicons 
            name="search" 
            size={20} 
            color={Colors.textSecondary} 
            style={isRtl ? styles.searchIconRtl : styles.searchIconLtr} 
          />
          <Text numberOfLines={1} style={textStyle}>
            {displayValue}
          </Text>
          <TouchableOpacity style={styles.locationButton} onPress={onLocationPress}>
            <FontAwesome6 name="location-dot" size={18} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    backgroundColor: Colors.black,
   
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    color: Colors.white,
    fontSize: 28,
    fontFamily: Fonts.bold,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.black,
    borderRadius: 25,
    paddingHorizontal: 7.5,
    height: 50,
    borderWidth: 1,
    borderColor: Colors.gray,
  },
  searchBarInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  searchIconLtr: {
    marginStart: 4,
    marginEnd: 8,
  },
  searchIconRtl: {
    marginStart: 4,
    marginEnd: 8,
  },
  input: {
    flex: 1,
    color: Colors.gray,
    fontSize: 16,
    fontFamily: Fonts.regular,
  },
  placeholderText: {
    color: Colors.textSecondary,
  },
  locationButton: {
    backgroundColor: Colors.darkflame,
    width: 35,
    height: 35,
    borderRadius: 17.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginStart: 7.5,
  },
  notificationBubble: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.black,
  },
});
