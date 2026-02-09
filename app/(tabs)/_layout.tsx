import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../src/constants/Colors";
import { Fonts } from "../../src/constants/Fonts";
import { useNotifications } from "../../src/hooks/useNotifications";
import { useSupabaseSync } from "../../src/hooks/useSupabaseSync";
import { useTrackSession } from "../../src/hooks/useTrackSession";
import { useUnreadMessagesSync } from "../../src/hooks/useUnreadMessagesSync";
import { useLanguage } from "../../src/lib/i18n";

const CustomTabButton = ({ children, onPress }: any) => (
  <TouchableOpacity
    style={styles.customButtonContainer}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={styles.customButton}>
      {children}
    </View>
  </TouchableOpacity>
);


export default function TabLayout() {
  useSupabaseSync();
  useTrackSession();
  useUnreadMessagesSync();
  const { hasUnreadEvents, hasUnreadMessages } = useNotifications();
  const { t } = useLanguage();
   const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          ...styles.tabBar,
          height: styles.tabBar.height + insets.bottom,
          paddingBottom: styles.tabBar.paddingBottom + insets.bottom,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tab_home"),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: t("tab_my_events"),
          tabBarIcon: ({ color, focused }) => (
            <View>
              <Ionicons
                name={focused ? "calendar" : "calendar-outline"}
                size={24}
                color={color}
              />
              {hasUnreadEvents && <View style={styles.notificationBubble} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: '',
          tabBarButton: (props) => (
            <CustomTabButton {...props}>
              <Ionicons name="add" size={32} color={Colors.white} />
            </CustomTabButton>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t("tab_messages"),
          tabBarIcon: ({ color, focused }) => (
            <View>
              <Ionicons
                name={
                  focused
                    ? "chatbubble-ellipses"
                    : "chatbubble-ellipses-outline"
                }
                size={24}
                color={color}
              />
              {hasUnreadMessages && <View style={styles.notificationBubble} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tab_you"),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />

    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.black,
    borderTopWidth: 0,
    height: 65,
    paddingBottom: 8,
    paddingTop: 8,
    borderColor: "rgba(255, 255, 255, 0.1)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  tabBarLabel: {
    fontSize: 10,
    fontFamily: Fonts.medium,
    marginTop: 2,
  },
  customButtonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  customButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
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
