import { useUser } from "@clerk/clerk-expo";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { EventCard } from "../../src/components/EventCard";
import { HorizontalEventList } from "../../src/components/HorizontalEventList";
import { TagsBar } from "../../src/components/TagsBar";
import { TopBar } from "../../src/components/TopBar";
import { Colors } from "../../src/constants/Colors";
import { Fonts } from "../../src/constants/Fonts";
import { useEvents } from "../../src/hooks/useEvents";
import { useTrackSession } from "../../src/hooks/useTrackSession";
import { useUserAnalytics } from "../../src/hooks/useUserAnalytics";
import { useAlert } from "../../src/lib/AlertContext";
import { useLanguage } from "../../src/lib/i18n";
import { useSupabaseClient } from "../../src/lib/supabaseConfig";

// getDistance utility is now imported from ../../src/utils/location
import { getDistance } from "../../src/utils/location";

export default function HomeScreen() {
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const { trackAction } = useTrackSession();
  const { language, t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const { userData } = useUserAnalytics();
  const allTagLabel = useMemo(() => t("create_event_gender_all") || "All", [t]);
  const nearMeLabel = useMemo(() => t("location_near_me") || "Near me", [t]);
  const [activeTag, setActiveTag] = useState(allTagLabel);
  const [userCity, setUserCity] = useState<string | null>(null);
  
  // Sync active tag is "All" when language changes
  useEffect(() => {
    setActiveTag(allTagLabel);
  }, [allTagLabel]);

  // Scroll animation values - DISABLED for stability
  // The header will now remain static to prevent disappearing/stuck issues
  const scrollY = React.useRef(new Animated.Value(0)).current;

  const [userLocation, setUserLocation] =
    useState<Location.LocationObject | null>(null);

  const fetchOptions = useMemo(
    () => ({
      personalized: true,
      userId: user?.id,
      userLocation: userLocation
        ? {
            latitude: userLocation.coords.latitude,
            longitude: userLocation.coords.longitude,
          }
        : null,
    }),
    [user?.id, userLocation],
  );

  const { events, loading, error, refetch } = useEvents(fetchOptions);

  // Function to handle location button press
  const handleLocationPress = React.useCallback(async () => {
    trackAction("location_request_manual");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setUserLocation(location);
        setActiveTag(nearMeLabel);
      } else {
        showAlert({
          title: t("location_settings_title") || "Location Access",
          message: t("location_permission_msg"),
          type: 'warning',
        });
      }
    } catch (error) {
      console.warn("Error getting location:", error);
      showAlert({
        title: t("error_title"),
        message: t("location_error_msg"),
        type: 'error',
      });
    }
  }, [trackAction, nearMeLabel, showAlert, t]);

  const onSearchChange = React.useCallback(() => {}, []);
  const onTagPress = React.useCallback((tag: string) => setActiveTag(tag), []);

  const checkLocationPermission = async () => {
    try {
      // Check existing permissions first
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
          // Only request if not already granted
          const { status } = await Location.requestForegroundPermissionsAsync();
          finalStatus = status;
      }
      
      if (finalStatus === "granted") {
        try {
          // Use High accuracy for "precised" location as requested
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          setUserLocation(location);
          setActiveTag(nearMeLabel);

          // Update user last_location in Supabase
          if (user?.id) {
            const [address] = await Location.reverseGeocodeAsync({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });
            
            const locationString = address ? `${address.city || ''}, ${address.country || ''}` : `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`;

            if (address && address.city) {
                setUserCity(address.city);
            }

            await supabase.from('users').update({ 
                last_location: locationString 
            }).eq('id', user.id);
          }
        } catch (posError) {
          // Silently ignore position errors (e.g. timeout or location disabled)
        }
      }
    } catch (error) {
      // Silently ignore permission request errors
    }
  };

  // Request location on mount
  useEffect(() => {
    checkLocationPermission();
  }, []);

  // Filter events based on selected tag and search query
  const filteredEvents = useMemo(() => {
    let result = events;

    // Filter by "Near me"
    if (activeTag === nearMeLabel) {
      if (!userLocation) return [];
      
      return result
        .map(event => {
            const hasCoords = event.latitude !== null && event.latitude !== undefined && 
                             event.longitude !== null && event.longitude !== undefined;
            if (hasCoords) {
                return {
                    ...event,
                    distance: getDistance(
                        userLocation.coords.latitude,
                        userLocation.coords.longitude,
                        event.latitude!,
                        event.longitude!
                    )
                };
            }
            return { ...event, distance: Infinity };
        })
        .filter((event: any) => event.distance < 50)
        .sort((a: any, b: any) => a.distance - b.distance);
    }

    // Filter by tag
    if (activeTag !== allTagLabel) {
      result = result.filter((event) =>
        event.tags?.some(
          (tag: string) => tag.toLowerCase() === activeTag.toLowerCase(),
        ),
      );
    }

    return result;
  }, [events, activeTag, userLocation]);

  // ==========================================
  // SMART RECOMMENDATION ALGORITHM
  // Shows ONE best recommendation section based on user data
  // ==========================================
  
  // Rotation counter that changes on each refresh to show different content
  const [rotationCounter, setRotationCounter] = useState(0);

  // Update rotation counter on refresh
  const handleRefresh = useCallback(async () => {
    setRotationCounter(prev => prev + 1);
    await refetch();
  }, [refetch]);

  // 1. Calculate all possible recommendation sections with quality scores
  const recommendationCandidates = useMemo(() => {
    const candidates: Array<{
      type: string;
      title: string;
      events: any[];
      score: number; // Higher = better quality/relevance
      component: React.ReactNode;
    }> = [];

    // Get IDs of events already in the main feed to avoid duplicates
    const mainFeedEventIds = new Set(filteredEvents.map(e => e.id));
    
    // Helper to filter out events already in main feed
    const filterUnique = (eventList: any[]) => 
      eventList.filter(e => !mainFeedEventIds.has(e.id));

    // CANDIDATE 1: Popular in User's City
    if (userCity) {
      const cityEvents = filterUnique(
        events.filter(event => event.location.toLowerCase().includes(userCity.toLowerCase()))
      ).slice(0, 5);
      
      if (cityEvents.length >= 3) { // Minimum 3 events to show
        candidates.push({
          type: 'popular_city',
          title: `${t('home_featured_popular')} ${userCity}`,
          events: cityEvents,
          score: 100 + cityEvents.length * 5, // Base 100 + bonus for more events
          component: (
            <HorizontalEventList 
              key="popular"
              title={`${t('home_featured_popular')} ${userCity}`} 
              events={cityEvents} 
            />
          )
        });
      }
    }

    // CANDIDATE 2: Based on User Interests
    const interests = userData?.interested_tags;
    if (interests && interests.length > 0) {
      // Try each interest and pick the one with most events
      let bestInterest: { tag: string; events: any[] } | null = null;
      
      for (const interest of interests) {
        const filtered = filterUnique(
          events.filter(event => 
            event.tags?.some(tag => tag.toLowerCase() === interest.toLowerCase())
          )
        );
        
        if (filtered.length > 0) {
          if (!bestInterest || filtered.length > bestInterest.events.length) {
            bestInterest = { tag: interest, events: filtered.slice(0, 5) };
          }
        }
      }

      if (bestInterest && bestInterest.events.length >= 2) {
        candidates.push({
          type: 'interest_based',
          title: `${t('home_featured_interested')} ${bestInterest.tag}`,
          events: bestInterest.events,
          score: 90 + bestInterest.events.length * 8, // Slightly lower base, but high bonus
          component: (
            <HorizontalEventList 
              key="interests"
              title={`${t('home_featured_interested')} ${bestInterest.tag}`} 
              events={bestInterest.events} 
            />
          )
        });
      }
    }

    // CANDIDATE 3: Nearby Events (if location available)
    if (userLocation && events.length > 0) {
      const nearbyEvents = filterUnique(events)
        .map(event => {
          const hasCoords = event.latitude !== null && event.latitude !== undefined && 
                           event.longitude !== null && event.longitude !== undefined;
          if (hasCoords) {
            return {
              ...event,
              distance: getDistance(
                userLocation.coords.latitude,
                userLocation.coords.longitude,
                event.latitude!,
                event.longitude!
              )
            };
          }
          return { ...event, distance: Infinity };
        })
        .filter((event: any) => event.distance < 20) // Within 20km
        .sort((a: any, b: any) => a.distance - b.distance)
        .slice(0, 5);

      if (nearbyEvents.length >= 3) {
        candidates.push({
          type: 'nearby',
          title: t("home_nearby"),
          events: nearbyEvents,
          score: 85 + nearbyEvents.length * 6,
          component: (
            <HorizontalEventList 
              key="nearby"
              title={t("home_nearby")} 
              events={nearbyEvents} 
            />
          )
        });
      }
    }

    // CANDIDATE 4: Trending Events (high attendance growth)
    const trendingEvents = filterUnique(events)
      .filter(event => event.attendingCount >= 5)
      .sort((a, b) => b.attendingCount - a.attendingCount)
      .slice(0, 5);

    if (trendingEvents.length >= 3) {
      candidates.push({
        type: 'trending',
        title: t("home_trending"),
        events: trendingEvents,
        score: 70 + trendingEvents.length * 4,
        component: (
          <HorizontalEventList 
            key="trending"
            title={t("home_trending")} 
            events={trendingEvents} 
          />
        )
      });
    }

    // CANDIDATE 5: Suggested for You (Fallback - always available)
    const suggestedEvents = filterUnique(events).slice(0, 5);
    if (suggestedEvents.length >= 3) {
      candidates.push({
        type: 'suggested',
        title: t('home_featured_suggested'),
        events: suggestedEvents,
        score: 50 + suggestedEvents.length * 2, // Lowest priority
        component: (
          <HorizontalEventList 
            key="suggested"
            title={t('home_featured_suggested')} 
            events={suggestedEvents} 
          />
        )
      });
    }

    return candidates;
  }, [events, filteredEvents, userCity, userData?.interested_tags, userLocation, language, t]);

  // 2. SELECT THE BEST RECOMMENDATION
  // Algorithm: Sort by score, then cycle through top candidates on each refresh
  const selectedRecommendation = useMemo(() => {
    if (recommendationCandidates.length === 0) return null;

    // Sort by score (descending)
    const sorted = [...recommendationCandidates].sort((a, b) => b.score - a.score);

    // Get top candidates based on availability
    const numTopCandidates = sorted.length >= 4 ? 4 : sorted.length;
    const topCandidates = sorted.slice(0, numTopCandidates);

    // Cycle through top candidates using rotation counter
    const selectedIndex = rotationCounter % topCandidates.length;
    
    return topCandidates[selectedIndex];
  }, [recommendationCandidates, rotationCounter]);

  // 3. CREATE MIXED FEED (90% Event Cards + 10% Horizontal Lists)
  // Inject HorizontalEventList sections between regular event cards
  const mixedFeedData = useMemo(() => {
    if (filteredEvents.length === 0) return [];

    const feed: Array<{ type: 'event' | 'recommendation'; data: any; id: string }> = [];
    
    // Insert recommendation sections at strategic positions
    // Strategy: Insert after every ~10 events (10% ratio)
    const insertInterval = 10;
    
    filteredEvents.forEach((event, index) => {
      // Add the regular event card
      feed.push({
        type: 'event',
        data: event,
        id: `event-${event.id}-${index}`
      });

      // Insert a recommendation section after every 10th event
      // But only if we have recommendations available
      if (selectedRecommendation && (index + 1) % insertInterval === 0) {
        // Cycle through different recommendations for variety
        const recIndex = Math.floor(index / insertInterval) % recommendationCandidates.length;
        const recommendation = recommendationCandidates[recIndex] || selectedRecommendation;
        
        feed.push({
          type: 'recommendation',
          data: recommendation,
          id: `recommendation-${index}-${recommendation.type}`
        });
      }
    });

    return feed;
  }, [filteredEvents, selectedRecommendation, recommendationCandidates]);

  const renderMixedItem = useCallback(({ item, index }: { item: any; index: number }) => {
    if (item.type === 'event') {
      return (
        <View style={styles.cardContainer}>
          <EventCard event={item.data} index={index} />
        </View>
      );
    } else if (item.type === 'recommendation') {
      return (
        <View style={styles.recommendationContainer}>
          {item.data.component}
        </View>
      );
    }
    return null;
  }, []);

  const keyExtractorMixed = useCallback((item: any) => item.id, []);

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <StatusBar barStyle="light-content" translucent={true} backgroundColor={Colors.black} />

      <Animated.View
        style={[
          styles.headerWrapper, 
          { 
            // transform: [{ translateY }], // Disabled animation
            paddingTop: insets.top + 10,
          }
        ]}
      >
        <TopBar
          searchQuery=""
          onSearchChange={onSearchChange}
          onLocationPress={handleLocationPress}
        />
        <TagsBar activeTag={activeTag} onTagPress={onTagPress} />
      </Animated.View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : mixedFeedData.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>
            {activeTag === allTagLabel
              ? t("home_no_events")
              : `${t("home_no_events_tag")} "${activeTag}"`}
          </Text>
        </View>
      ) : (
        <Animated.FlatList
          data={mixedFeedData}
          renderItem={renderMixedItem}
          keyExtractor={keyExtractorMixed}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          windowSize={5}
          maxToRenderPerBatch={10}
          removeClippedSubviews={true}
          contentContainerStyle={[
            styles.listContent,
            { 
              paddingTop: insets.top + 180, // Safe area + Header height
              paddingBottom: insets.bottom + 120 
            }
          ]}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
              titleColor={Colors.primary}
            />
          }
          // onScroll removed to disable animation drive
          scrollEventThrottle={16}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  headerWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000, // Increased z-index to ensure it's always on top
    backgroundColor: Colors.black,
    elevation: 10, // For Android
    shadowColor: '#000', // For iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    paddingTop: 10, // Space below status bar
    paddingBottom: 5, // Space below TagsBar
  },
  listContent: {
    // Padding is now dynamic based on safe area insets
  },
  headerContent: {
    marginBottom: 10,
  },
  greetingSection: {
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  greetingText: {
    color: Colors.white,
    fontSize: 24,
    fontFamily: Fonts.bold,
  },
  subGreetingText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: Fonts.regular,
    marginTop: 4,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: Colors.primary,
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 20,
    fontFamily: Fonts.medium,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 20,
    fontFamily: Fonts.medium,
  },
  cardContainer: {
    paddingHorizontal: 15,
  },
  recommendationContainer: {
    marginTop: 5,
    marginBottom: 10,
  },
});
