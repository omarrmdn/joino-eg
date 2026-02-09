import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React from "react";
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "../src/constants/Colors";
import { Fonts } from "../src/constants/Fonts";
import { useAlert } from "../src/lib/AlertContext";
import { useLanguage } from "../src/lib/i18n";
import { useSupabaseClient } from "../src/lib/supabaseConfig";

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const { language, setLanguage, t } = useLanguage();
  const { signOut } = useAuth();
  const { showAlert } = useAlert();




  const handleSignOut = () => {
    showAlert({
      title: t("settings_sign_out_confirm_title"),
      message: t("settings_sign_out_confirm_message"),
      type: 'warning',
      buttons: [
        {
          text: t("settings_sign_out_cancel"),
          style: "cancel",
        },
        {
          text: t("settings_sign_out_confirm"),
          style: "destructive",
          onPress: async () => {
            try {
              // Clear onboarding state first
              await AsyncStorage.removeItem('onboardingDone');
              // Sign out last - this will trigger RootLayout to re-render and switch views
              await signOut();
            } catch (error) {
              console.error("Error signing out:", error);
            }
          },
        },
      ]
    });
  };

  const handleChangeLanguage = async (lang: "en" | "ar") => {
    await setLanguage(lang);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons
            name={language === "ar" ? "chevron-forward" : "chevron-back"}
            size={28}
            color={Colors.white}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("settings_title")}</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>{t("settings_language")}</Text>
        <Text style={styles.sectionDescription}>
          {t("settings_language_description")}
        </Text>

        <View style={styles.languageOptions}>
          <TouchableOpacity
            style={[
              styles.languageOption,
              language === "en" && styles.languageOptionActive,
            ]}
            onPress={() => handleChangeLanguage("en")}
          >
            <Text
              style={[
                styles.languageOptionText,
                language === "en" && styles.languageOptionTextActive,
              ]}
            >
              {t("settings_language_en")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.languageOption,
              language === "ar" && styles.languageOptionActive,
            ]}
            onPress={() => handleChangeLanguage("ar")}
          >
            <Text
              style={[
                styles.languageOptionText,
                language === "ar" && styles.languageOptionTextActive,
              ]}
            >
              {t("settings_language_ar")}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.noteText}>
          {t("settings_reload_note")}
        </Text>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={24} color={Colors.error} />
          <Text style={styles.signOutText}>{t("settings_sign_out")}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: 20,
    fontFamily: Fonts.bold,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    color: Colors.white,
    fontSize: 18,
    fontFamily: Fonts.bold,
    marginBottom: 6,
  },
  sectionDescription: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: Fonts.regular,
    marginBottom: 16,
  },
  languageOptions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  languageOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.lightblack,
    alignItems: "center",
  },
  languageOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  languageOptionText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontFamily: Fonts.medium,
  },
  languageOptionTextActive: {
    color: Colors.white,
  },
  noteText: {
    marginTop: 12,
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.lightblack,
    marginVertical: 24,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    backgroundColor: "rgba(255, 59, 48, 0.1)", // Light red background
    borderWidth: 1,
    borderColor: "rgba(255, 59, 48, 0.2)",
  },
  signOutText: {
    color: Colors.error,
    fontSize: 16,
    fontFamily: Fonts.bold,
    marginLeft: 8,
  },

});

