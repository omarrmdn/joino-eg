import { Fonts } from '@/src/constants/Fonts';
import { useOAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Applogo from '../src/components/applogo';
import { Colors } from '../src/constants/Colors';
import { useWarmUpBrowser } from '../src/hooks/useWarmUpBrowser';
import { useLanguage } from '../src/lib/i18n';

WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get('window');

export default function OnboardingScreen({ onFinish }: { onFinish: () => void }) {
  useWarmUpBrowser();

  const { t, language, setLanguage } = useLanguage();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  const handleGoogleLogin = React.useCallback(async () => {
    try {
      const redirectUrl = Linking.createURL('/');
      console.log('Redirect URL:', redirectUrl);
      const { createdSessionId, setActive, signUp, signIn } = await startOAuthFlow({
        redirectUrl,
      });

      if (createdSessionId) {
        if (setActive) {
            await setActive({ session: createdSessionId });
            await AsyncStorage.setItem('onboardingDone', 'true');
            onFinish();
        }
      } else {
        // Use signIn or signUp for next steps such as MFA
      }
    } catch (err) {
      console.error('OAuth error', err);
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Language Toggle Button */}
      <TouchableOpacity 
        style={[styles.languageButton, language === 'ar' ? styles.languageButtonLeft : styles.languageButtonRight]}
        onPress={toggleLanguage}
        activeOpacity={0.7}
      >
        <Ionicons name="language" size={24} color={Colors.white} />
        <Text style={styles.languageButtonText}>{language === 'en' ? 'ع' : 'EN'}</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.header}>
          <Applogo width={160} height={160} />
          <Text style={styles.title}>{t("onboarding_title")}</Text>
          <Text style={styles.subtitle}>{t("onboarding_subtitle")}</Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.googleButton} 
            onPress={handleGoogleLogin}
            activeOpacity={0.8}
          >
            <View style={styles.googleIconContainer}>
                <Ionicons name="logo-google" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.googleButtonText}>{t("onboarding_google_button")}</Text>
          </TouchableOpacity>
          
          <Text style={styles.termsText}>
            {t("onboarding_terms")}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: Colors.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    gap: 20, 
    justifyContent: 'center'
  },
  title: { 
    fontSize: 42, 
    
    color: Colors.white,
    marginTop: 20,
    fontFamily: Fonts.semibold,
  },
  subtitle: { 
    fontSize: 18, 
    color: Colors.lightflame,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 26,
    paddingHorizontal: 20,
    fontFamily: Fonts.medium,
  },
  footer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    width: '100%',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  googleIconContainer: {
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.black,
    fontFamily: 'GraphikArabic-Semibold',
  },
  termsText: {
    fontSize: 12,
    color: Colors.lightflame,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
    fontFamily: 'GraphikArabic-Regular',
  },
  languageButton: {
    position: 'absolute',
    top: 50,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  languageButtonLeft: {
    left: 20,
  },
  languageButtonRight: {
    right: 20,
  },
  languageButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontFamily: Fonts.semibold,
  },
});