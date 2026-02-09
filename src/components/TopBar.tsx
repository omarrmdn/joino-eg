import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Fonts";
import { useAnimatedSearchPlaceholder } from "../hooks/useAnimatedSearchPlaceholder";
import { useNotifications } from "../hooks/useNotifications";
import TopbarLogo from "./topbarLogo";

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (text: string) => void;
  onLocationPress: () => void;
}

export const TopBar = React.memo(({ searchQuery, onSearchChange, onLocationPress }: TopBarProps) => {
  const router = useRouter();
  const { hasUnreadNotifications } = useNotifications();
  const animatedPlaceholder = useAnimatedSearchPlaceholder({
    active: !searchQuery,
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TopbarLogo style={styles.logo}/>
        <TouchableOpacity onPress={() => router.push('/notifications' as any)}>
          <View>
            <Ionicons name="notifications-outline" size={28} color={Colors.white} />
            {hasUnreadNotifications && <View style={[styles.notificationBubble, { top: 2, right: 2 }]} />}
          </View>
        </TouchableOpacity>
      </View>
      <TouchableOpacity 
        activeOpacity={0.9} 
        style={styles.searchContainer} 
        onPress={() => router.push('/search' as any)}
      >
        <Ionicons name="search" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          placeholder={animatedPlaceholder}
          placeholderTextColor={Colors.textSecondary}
          style={styles.input}
          value={searchQuery}
          onChangeText={onSearchChange}
          editable={false} // Make it a button that navigates
          pointerEvents="none" 
        />
        <TouchableOpacity style={styles.locationButton} onPress={onLocationPress}>
          <FontAwesome6 name="location-dot" size={18} color={Colors.primary} />
        </TouchableOpacity>
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
    paddingHorizontal: 8,
    height: 50,
    borderWidth: 1,
    borderColor: Colors.gray,
  },
  searchIcon: {
    marginHorizontal:8
  },
  input: {
    flex: 1,
    color: Colors.gray,
    fontSize: 16,
    fontFamily: Fonts.regular,
  },
  locationButton: {
    backgroundColor: Colors.darkflame,
    width: 35,
    height: 35,
    borderRadius: 17.5,
    justifyContent: 'center',
    alignItems: 'center',
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
