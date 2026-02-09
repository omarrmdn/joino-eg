import { Colors } from "@/src/constants/Colors";
import { Stack } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";

export default function MessagesLayout() {
  return (
    <View style={styles.container}>
      <Stack screenOptions={{ headerShown: false, contentStyle: styles.content }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="chat/[id]" options={{ presentation: 'card' }} />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  content: {
    backgroundColor: Colors.black,
  },
});
