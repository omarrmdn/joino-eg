import { ClerkLoaded, ClerkProvider, useAuth } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { PostHogProvider } from "posthog-react-native";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import 'react-native-url-polyfill/auto';
import { NotificationProvider } from "../notification/NotificationProvider";
import { unregisterPushToken, usePushNotifications } from "../notification/usePushNotifications";
import Applogo from "../src/components/applogo";
import { Colors } from "../src/constants/Colors";
import { useTrackSession } from "../src/hooks/useTrackSession";
import { AlertProvider } from "../src/lib/AlertContext";
import { tokenCache } from "../src/lib/cache";
import { LanguageProvider, useLanguage } from "../src/lib/i18n";
import { useSupabaseClient } from "../src/lib/supabaseConfig";
import OnboardingScreen from "./Onboarding";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || "";

if (!publishableKey) {
  console.error(
    "❌ [Critical] Missing Clerk Publishable Key. The app will not be able to authenticate users."
  );
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => {});

function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [loaded, error] = useFonts({
    "GraphikArabic-Thin": require("../assets/fonts/graphik-arabic-thin.otf"),
    "GraphikArabic-ExtraLight": require("../assets/fonts/graphik-arabic-extralight.otf"),
    "GraphikArabic-Light": require("../assets/fonts/graphik-arabic-light.otf"),
    "GraphikArabic-Regular": require("../assets/fonts/graphik-arabic.otf"),
    "GraphikArabic-Medium": require("../assets/fonts/graphik-arabic-medium.otf"),
    "GraphikArabic-Semibold": require("../assets/fonts/graphik-arabic-semibold.otf"),
    "GraphikArabic-Bold": require("../assets/fonts/graphik-arabic-bold.otf"),
    "GraphikArabic-Black": require("../assets/fonts/graphik-arabic-black.otf"),
    "GraphikArabic-Super": require("../assets/fonts/graphik-arabic-super.otf"),
  });

  useEffect(() => {
    async function prepare() {
      try {
        console.log("🚀 [RootLayout] Preparing app...");
        const onboardingDone = await AsyncStorage.getItem('onboardingDone');
        setShowOnboarding(onboardingDone !== 'true');
        console.log("🚀 [RootLayout] Onboarding state:", onboardingDone !== 'true');
      } catch (e) {
        console.warn('🚀 [RootLayout] Failed to load onboarding state:', e);
        setShowOnboarding(true); // Fallback
      }
    }
    prepare();
  }, []);

  useEffect(() => {
    if (error) {
      console.error("🚀 [RootLayout] Font loading error:", error);
    }
    
    if ((loaded || error) && showOnboarding !== null) {
      console.log("🚀 [RootLayout] Assets loaded. Ready to hide splash.");
      const timer = setTimeout(async () => {
        try {
          setAppIsReady(true);
          await SplashScreen.hideAsync();
          console.log("🚀 [RootLayout] Splash screen hidden.");
        } catch (e) {
          console.warn("🚀 [RootLayout] Error hiding splash status:", e);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loaded, error, showOnboarding]);

  // Fail-safe: Hide splash screen after 5 seconds no matter what
  useEffect(() => {
    const backupTimer = setTimeout(async () => {
      if (!appIsReady) {
        console.warn("🚀 [RootLayout] Fail-safe: Forcing app is ready after timeout.");
        setAppIsReady(true);
        try {
          await SplashScreen.hideAsync();
        } catch (e) {}
      }
    }, 5000);
    return () => clearTimeout(backupTimer);
  }, [appIsReady]);

  if (!publishableKey) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Applogo width={100} height={100} />
        <View style={{ height: 40 }} />
        <View style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: 15, borderRadius: 10 }}>
            <View style={{ alignItems: 'center' }}>
                <View style={{ backgroundColor: '#FFD700', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
                    <View style={{ width: 4, height: 15, backgroundColor: 'black', borderRadius: 2 }} />
                    <View style={{ width: 4, height: 4, backgroundColor: 'black', borderRadius: 2, marginTop: 2 }} />
                </View>
                <View style={{ height: 2 }} />
            </View>
            <View style={{ alignItems: 'center' }}>
                <View style={{ backgroundColor: 'white', padding: 10, borderRadius: 5 }}>
                    <View style={{ alignItems: 'center' }}>
                        <View style={{ width: 200 }}>
                            <View style={{ height: 10, backgroundColor: '#eee', borderRadius: 5, width: '100%' }} />
                            <View style={{ height: 10, backgroundColor: '#eee', borderRadius: 5, width: '80%', marginTop: 5 }} />
                        </View>
                    </View>
                </View>
            </View>
        </View>
      </View>
    );
  }

  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      <ClerkLoaded>
        <PostHogProvider
          apiKey="phc_CKd9g9jWbcuVruilxoBWw4uMxk0rN2qQNEYblY7bYLd"
          options={{
            host: "https://eu.i.posthog.com",
            enableSessionReplay: true,
            captureAppLifecycleEvents: true,
          }}
          autocapture={{
            captureTouches: true,
            captureScreens: true,
          }}
        >
          <LanguageProvider>
            <NotificationProvider>
              <AlertProvider>
                <RootContent 
                  appIsReady={appIsReady} 
                  showOnboarding={showOnboarding} 
                  setShowOnboarding={setShowOnboarding}
                />
              </AlertProvider>
            </NotificationProvider>
          </LanguageProvider>
        </PostHogProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}

interface RootContentProps {
  appIsReady: boolean;
  showOnboarding: boolean | null;
  setShowOnboarding: (val: boolean) => void;
}

const RootContent = ({ appIsReady, showOnboarding, setShowOnboarding }: RootContentProps) => {
  const { isLoaded: authLoaded, isSignedIn, userId } = useAuth();
  const supabase = useSupabaseClient();
  const { trackAction } = useTrackSession();
  const { language } = useLanguage();
  
  // Initialize Push Notifications
  usePushNotifications();

  // Sync language with Supabase user record
  useEffect(() => {
    if (isSignedIn && userId && language) {
       // Fire and forget update
       supabase.from('users').update({ language }).eq('id', userId).then(({ error }) => {
         if (error) console.warn('[RootContent] Language sync error:', error);
       });

       // Auto-detect currency via IP
       import('../src/utils/currency').then(({ autoDetectAndUpdateUserCurrency }) => {
          autoDetectAndUpdateUserCurrency(supabase, userId).catch(err => {
             console.warn('[RootContent] Currency detect error:', err);
          });
       });
    }
  }, [isSignedIn, userId, language]);
  const prevSignedInRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (appIsReady) {
      trackAction("app_open");
    }
  }, [appIsReady, trackAction]);

  useEffect(() => {
    if (!authLoaded) return;
    
    if (prevSignedInRef.current === null) {
      prevSignedInRef.current = isSignedIn ?? null;
      return;
    }
    if (isSignedIn && !prevSignedInRef.current) {
      trackAction("login");
    } else if (!isSignedIn && prevSignedInRef.current) {
      trackAction("logout");
      unregisterPushToken(supabase);
    }
    prevSignedInRef.current = isSignedIn ?? null;
  }, [isSignedIn, authLoaded, trackAction]);
  
  if (showOnboarding === null || !appIsReady || !authLoaded) {
    return (
      <View style={styles.splashContainer}>
        <Applogo width={160} height={160} />
      </View>
    );
  }
  
  // If the user is signed in, skip onboarding and go straight to the tabs
  if (isSignedIn) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.black }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </View>
    );
  }

  // Otherwise show onboarding/login
  return <OnboardingScreen onFinish={() => setShowOnboarding(false)} />;
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default RootLayout;

