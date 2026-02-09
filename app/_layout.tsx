import { ClerkLoaded, ClerkProvider, useAuth } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { PostHogProvider } from "posthog-react-native";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { withStallion } from "react-native-stallion";
import 'react-native-url-polyfill/auto';
import Applogo from "../src/components/applogo";
import { Colors } from "../src/constants/Colors";
import { AlertProvider } from "../src/lib/AlertContext";
import { tokenCache } from "../src/lib/cache";
import { LanguageProvider } from "../src/lib/i18n";
import OnboardingScreen from "./Onboarding";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error(
    "Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env"
  );
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

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
        const onboardingDone = await AsyncStorage.getItem('onboardingDone');
        setShowOnboarding(onboardingDone !== 'true');
      } catch (e) {
        console.warn('Failed to load onboarding state:', e);
        setShowOnboarding(true); // Fallback
      }
    }
    prepare();
  }, []);

  useEffect(() => {
    if ((loaded || error) && showOnboarding !== null) {
      const timer = setTimeout(() => {
        setAppIsReady(true);
        SplashScreen.hideAsync();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [loaded, error, showOnboarding]);

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
            <AlertProvider>
              <RootContent 
                appIsReady={appIsReady} 
                showOnboarding={showOnboarding} 
                setShowOnboarding={setShowOnboarding}
              />
            </AlertProvider>
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
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  
  if (showOnboarding === null || !appIsReady || !authLoaded) {
    return (
      <View style={styles.splashContainer}>
        <Applogo width={200} height={200} />
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

export default withStallion(RootLayout);