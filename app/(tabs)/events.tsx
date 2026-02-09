import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DaysSlider } from "../../src/components/DaysSlider";
import { SearchResult } from "../../src/components/SearchResult";
import { Colors } from "../../src/constants/Colors";
import { Fonts } from "../../src/constants/Fonts";
import { useLanguage } from "../../src/lib/i18n";
import { notificationManager } from "../../src/lib/NotificationManager";
import { useSupabaseClient } from "../../src/lib/supabaseConfig";
import { EventCardData, transformEventToCardData } from "../../src/types/database";

export default function EventsScreen() {
  const { user } = useUser();
  const router = useRouter();
  const supabase = useSupabaseClient();
  const [events, setEvents] = useState<EventCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { t, language } = useLanguage();

  const fetchMyEvents = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // 1. Fetch events organized by the user
      const { data: organizedData, error: organizedError } = await supabase
        .from('events')
        .select(`
          *,
          organizer:users!events_organizer_id_fkey (
            name,
            image_url
          ),
          attendees (
            user_id
          ),
          event_tags (
            tags (
              name
            )
          )
        `)
        .eq('organizer_id', user.id)
        .neq('status', 'ended')
        .neq('status', 'canceled')
        .gte('date', new Date().toISOString().split('T')[0]);

      if (organizedError) throw organizedError;

      // 2. Fetch events the user is attending
      const { data: attendedIds, error: attendedIdsError } = await supabase
        .from('attendees')
        .select('event_id')
        .eq('user_id', user.id);

      if (attendedIdsError) throw attendedIdsError;

      let allEventsData = organizedData || [];

      if (attendedIds && attendedIds.length > 0) {
        const attendedEventIds = attendedIds.map(a => a.event_id);
        const uniqueAttendedIds = attendedEventIds.filter(id => !allEventsData.find(e => e.id === id));

        if (uniqueAttendedIds.length > 0) {
          const { data: attendedData, error: attendedError } = await supabase
            .from('events')
            .select(`
              *,
              organizer:users!events_organizer_id_fkey (
                name,
                image_url
              ),
              attendees (
                user_id
              ),
              event_tags (
                tags (
                  name
                )
              )
            `)
            .in('id', uniqueAttendedIds)
            .neq('status', 'ended')
            .gte('date', new Date().toISOString().split('T')[0]);

          if (attendedError) throw attendedError;
          allEventsData = [...allEventsData, ...(attendedData || [])];
        }
      }
      
      const mapped = allEventsData.map((event: any) => transformEventToCardData(event, user.id));
      
      // Sort by date then time
      mapped.sort((a, b) => {
        if (a.rawDate !== b.rawDate) return a.rawDate.localeCompare(b.rawDate);
        return a.time.localeCompare(b.time);
      });

      setEvents(mapped);
      
      const now = new Date();
      const todayStr = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0')
      ].join('-');

      // Auto-select Today if it has events, or the first upcoming date, or just the first date
      const uniqueDates = Array.from(new Set(mapped.map(e => e.rawDate))).sort();
      if (uniqueDates.length > 0) {
        if (!selectedDate || !uniqueDates.includes(selectedDate)) {
          if (uniqueDates.includes(todayStr)) {
            setSelectedDate(todayStr);
          } else {
            const upcoming = uniqueDates.find(d => d >= todayStr);
            setSelectedDate(upcoming || uniqueDates[0]);
          }
        }
      } else {
        setSelectedDate(todayStr);
      }
    } catch (err) {
      console.error('Fetch My Events Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    notificationManager.setHasUnreadEvents(false);
    fetchMyEvents();
  }, [user]);

  // Derive unique dates that have events, only include Today if it has events
  const availableDates = useMemo(() => {
    const now = new Date();
    const todayStr = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0')
    ].join('-');

    const dates = events.map(e => e.rawDate);
    const uniqueDates = Array.from(new Set(dates));
    
    // Only include today if there are events for today
    const hasEventsToday = uniqueDates.includes(todayStr);
    if (hasEventsToday) {
      return Array.from(new Set([todayStr, ...uniqueDates])).sort();
    }
    
    return uniqueDates.sort();
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (!selectedDate) return [];
    return events.filter(e => e.rawDate === selectedDate);
  }, [events, selectedDate]);

  if (loading && events.length === 0) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name={language === 'ar' ? "chevron-forward" : "chevron-back"} size={28} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("events_my_events_title")}</Text>
        <View style={styles.menuButton} />
      </View>

      {/* Days Slider - Only shows days with events */}
      <View style={{ height: 110 }}>
        {availableDates.length > 0 && (
          <DaysSlider 
            availableDates={availableDates}
            selectedDate={selectedDate} 
            onDateSelect={setSelectedDate} 
          />
        )}
      </View>
      
      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <SearchResult event={item} index={index} />}
        contentContainerStyle={styles.listContent}
        style={styles.list}
        onRefresh={fetchMyEvents}
        refreshing={loading}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={64} color={Colors.gray} />
              <Text style={styles.emptyText}>{t("events_empty")}</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  backButton: {
    padding: 5,
  },
  menuButton: {
    padding: 5,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: 22,
    fontFamily: Fonts.bold,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.black,
  },
  emptyContainer: {
    paddingTop: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: Colors.gray,
    fontSize: 16,
    fontFamily: Fonts.medium,
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 5,
    paddingBottom: 40,
  },
});

