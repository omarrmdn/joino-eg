import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "../src/constants/Colors";
import { Fonts } from "../src/constants/Fonts";
import { useAlert } from "../src/lib/AlertContext";
import { useCurrency } from "../src/lib/CurrencyContext";
import { useLanguage } from "../src/lib/i18n";

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { language, setLanguage, t } = useLanguage();
  const { selectedCurrency, setCurrency } = useCurrency();
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

  const handleChangeLanguage = async (lang: "en" | "ar" | "ar-EG") => {
    await setLanguage(lang);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons
            name={language === "ar" || language === "ar-EG" ? "chevron-forward" : "chevron-back"}
            size={28}
            color={Colors.white}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("settings_title")}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
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

          <TouchableOpacity
            style={[
              styles.languageOption,
              language === "ar-EG" && styles.languageOptionActive,
            ]}
            onPress={() => handleChangeLanguage("ar-EG")}
          >
            <Text
              style={[
                styles.languageOptionText,
                language === "ar-EG" && styles.languageOptionTextActive,
              ]}
            >
              {t("settings_language_ar_eg")}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.noteText}>
          {t("settings_reload_note")}
        </Text>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>{t("settings_currency")}</Text>
        <Text style={styles.sectionDescription}>
          {t("settings_currency_description")}
        </Text>

        <View style={styles.currencyOptions}>
          {["EGP", "USD", "EUR", "SAR", "AED"].map((code) => (
            <TouchableOpacity
              key={code}
              style={[
                styles.currencyOption,
                selectedCurrency === code && styles.currencyOptionActive,
              ]}
              onPress={() => setCurrency(code)}
            >
              <Text
                style={[
                  styles.currencyOptionText,
                  selectedCurrency === code && styles.currencyOptionTextActive,
                ]}
              >
                {code}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={24} color={Colors.error} />
          <Text style={styles.signOutText}>{t("settings_sign_out")}</Text>
        </TouchableOpacity>
      </ScrollView>
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
  currencyOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  currencyOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.lightblack,
    alignItems: "center",
    minWidth: 70,
  },
  currencyOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  currencyOptionText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontFamily: Fonts.medium,
  },
  currencyOptionTextActive: {
    color: Colors.white,
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
