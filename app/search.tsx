import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import * as ExpoLocation from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { SearchResult } from "../src/components/SearchResult";
import { Colors } from "../src/constants/Colors";
import { Fonts } from "../src/constants/Fonts";
import { useEvents } from "../src/hooks/useEvents";
import { useTrackSession } from "../src/hooks/useTrackSession";
import { useLanguage } from "../src/lib/i18n";

export default function SearchScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { trackAction } = useTrackSession();
  const params = useLocalSearchParams();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const isRtl = language === "ar" || language === "ar-EG";
  
  const [searchQuery, setSearchQuery] = useState((params.q as string) || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  
  // Filter states
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [eventType, setEventType] = useState<'all' | 'online' | 'onsite'>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [nearMe, setNearMe] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);

  const isEmptyQuery =
    searchQuery.replace(/[\u200E\u200F\u061C]/g, "").trim().length === 0;

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      if (searchQuery.length > 2) {
        trackAction('search_screen_query', { query: searchQuery });
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Handle location for "Near me"
  useEffect(() => {
    if (nearMe && !userLocation) {
      (async () => {
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await ExpoLocation.getCurrentPositionAsync({});
          setUserLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude
          });
        } else {
          setNearMe(false);
        }
      })();
    }
  }, [nearMe]);

  const fetchOptions = React.useMemo(() => ({
    searchQuery: debouncedSearch,
    userId: user?.id,
    personalized: true,
    maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
    eventType,
    gender: genderFilter,
    userLocation: nearMe ? userLocation : null
  }), [debouncedSearch, user?.id, maxPrice, eventType, genderFilter, nearMe, userLocation]);

  const { events, loading, error } = useEvents(fetchOptions);

  const resetFilters = () => {
    setMaxPrice('');
    setEventType('all');
    setGenderFilter('all');
    setNearMe(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <StatusBar barStyle="light-content" translucent />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Search</Text>
        </View>

        <View style={styles.searchBarContainer}>
          <View style={[styles.searchBar, isRtl && { flexDirection: 'row-reverse' }]}>
            <Ionicons
              name="search"
              size={20}
              color={Colors.textSecondary}
              style={[styles.searchIcon, isRtl && { marginRight: 0, marginLeft: 10 }]}
            />
            <TextInput
              style={[
                styles.input, 
                isRtl && { textAlign: 'right', writingDirection: 'rtl' }
              ]}
              placeholder="search"
              placeholderTextColor={Colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={!params.q}
              returnKeyType="search"
            />
            <TouchableOpacity 
              style={[styles.filterButton, (maxPrice || eventType !== 'all' || genderFilter !== 'all' || nearMe) && styles.filterButtonActive]}
              onPress={() => setIsFilterVisible(true)}
            >
              <Ionicons name="funnel" size={18} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Filter Modal */}
      <Modal
        visible={isFilterVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsFilterVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setIsFilterVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.white} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Max Price */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Max Price</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="E£ 0.00"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="numeric"
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                />
              </View>

              {/* Event Type */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Event Type</Text>
                <View style={styles.segmentedControl}>
                  {(['all', 'online', 'onsite'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.segment, eventType === type && styles.segmentActive]}
                      onPress={() => setEventType(type)}
                    >
                      <Text style={[styles.segmentText, eventType === type && styles.segmentTextActive]}>
                        {type === 'all' ? 'All' : type === 'online' ? 'Online' : 'Onsite'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Gender */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Gender</Text>
                <View style={styles.segmentedControl}>
                  {(['all', 'male', 'female'] as const).map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.segment, genderFilter === g && styles.segmentActive]}
                      onPress={() => setGenderFilter(g)}
                    >
                      <Text style={[styles.segmentText, genderFilter === g && styles.segmentTextActive]}>
                        {g === 'all' ? 'All' : g === 'male' ? 'Male' : 'Female'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Near Me Toggle */}
              <View style={[styles.filterSection, styles.rowBetween]}>
                <Text style={styles.filterLabel}>Near me</Text>
                <Switch
                  value={nearMe}
                  onValueChange={setNearMe}
                  trackColor={{ false: Colors.darkGray, true: Colors.primaryTransparent }}
                  thumbColor={nearMe ? Colors.primary : Colors.lightGray}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={() => setIsFilterVisible(false)}>
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {!debouncedSearch.trim() ? (
        <View style={styles.centerContent}>
          <Ionicons
            name="search-outline"
            size={80}
            color={Colors.darkGray}
            style={{ marginBottom: 20 }}
          />
          <Text style={styles.emptyText}>{t("search_placeholder")}</Text>
        </View>
      ) : (
        <>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>
              {t("search_results_title")}
            </Text>
          </View>

          {loading ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : error ? (
            <View style={styles.centerContent}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <FlatList
              data={events}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              renderItem={({ item, index }) => (
                <SearchResult event={item} index={index} />
              )}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              initialNumToRender={10}
              windowSize={5}
              maxToRenderPerBatch={10}
              removeClippedSubviews={Platform.OS === "android"}
              ListEmptyComponent={
                <View style={styles.centerContent}>
                  <Text style={styles.emptyText}>
                    {t("search_empty_results")} "{debouncedSearch}"
                  </Text>
                </View>
              }
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 15,
  },
  headerTitleContainer: {
    marginBottom: 5,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchBarContainer: {
    marginBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 30,
    paddingHorizontal: 15,
    height: 55,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: Colors.white,
    fontSize: 16,
    fontFamily: Fonts.medium,
  },
  filterButton: {
    backgroundColor: Colors.darkGray,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  resultsHeader: {
    paddingHorizontal: 20,
    marginVertical: 15,
  },
  resultsTitle: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontFamily: Fonts.medium,
  },
  errorText: {
    color: Colors.primary,
    fontSize: 16,
    fontFamily: Fonts.medium,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.lightblack,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  filterSection: {
    marginBottom: 25,
  },
  filterLabel: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    color: Colors.white,
    marginBottom: 12,
  },
  priceInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 15,
    color: Colors.white,
    fontFamily: Fonts.medium,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: Colors.primary,
  },
  segmentText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.medium,
    fontSize: 14,
  },
  segmentTextActive: {
    color: Colors.white,
    fontFamily: Fonts.bold,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 10,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  resetButtonText: {
    color: Colors.white,
    fontFamily: Fonts.medium,
    fontSize: 16,
  },
  applyButton: {
    flex: 2,
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 15,
  },
  applyButtonText: {
    color: Colors.white,
    fontFamily: Fonts.bold,
    fontSize: 16,
  },
});
