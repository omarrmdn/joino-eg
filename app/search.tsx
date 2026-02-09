import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SearchResult } from "../src/components/SearchResult";
import TopbarLogo from "../src/components/topbarLogo";
import { Colors } from "../src/constants/Colors";
import { Fonts } from "../src/constants/Fonts";
import { useEvents } from "../src/hooks/useEvents";
import { useTrackSession } from "../src/hooks/useTrackSession";
import { useAnimatedSearchPlaceholder } from "../src/hooks/useAnimatedSearchPlaceholder";
import { useLanguage } from "../src/lib/i18n";

export default function SearchScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { trackAction } = useTrackSession();
  const params = useLocalSearchParams();
  const { t } = useLanguage();
  
  const [searchQuery, setSearchQuery] = useState((params.q as string) || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const animatedPlaceholder = useAnimatedSearchPlaceholder({
    active: searchQuery.length === 0,
  });

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

  const fetchOptions = React.useMemo(() => ({
    searchQuery: debouncedSearch,
    userId: user?.id,
    personalized: true
  }), [debouncedSearch, user?.id]);

  const { events, loading, error } = useEvents(fetchOptions);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TopbarLogo />
          <TouchableOpacity onPress={() => router.push('/notifications' as any)}>
            <Ionicons name="notifications-outline" size={28} color={Colors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBarContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.input}
              placeholder={animatedPlaceholder}
              placeholderTextColor={Colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={!params.q}
            />
            <TouchableOpacity style={styles.filterButton}>
              <Ionicons name="funnel" size={18} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.resultsHeader}>
        <Text style={styles.resultsTitle}>
          {t("search_results_title")} ({events.length})
        </Text>
      </View>

      {loading && debouncedSearch ? (
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
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <SearchResult event={item} index={index} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          windowSize={5}
          maxToRenderPerBatch={10}
          removeClippedSubviews={Platform.OS === 'android'}
          ListEmptyComponent={
            debouncedSearch ? (
              <View style={styles.centerContent}>
                <Text style={styles.emptyText}>{t("search_empty_results")} "{debouncedSearch}"</Text>
              </View>
            ) : null
          }
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 20,
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
    backgroundColor: Colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
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
});
