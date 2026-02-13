import { useUser } from "@clerk/clerk-expo";
import { useCallback, useEffect, useState } from "react";
import { EVENTS, TAGS } from "../constants/DummyData";
import { useLanguage } from "../lib/i18n";
import { useSupabaseClient } from "../lib/supabaseConfig";
import { EventCardData, transformEventToCardData } from "../types/database";
import {
  autoDetectAndUpdateUserCurrency,
  buildCurrencyContext,
  DEFAULT_CURRENCY_CODE,
  getCountryCodeFromLocale,
} from "../utils/currency";
import { getGeoInfoByIP } from "../utils/ip";
import { getDistance } from "../utils/location";


// Helper to generate upcoming occurrences for recurring events
const RECURRENCE_DAYS_AHEAD = 60;

function generateRecurringOccurrences(event: any): any[] {
  if (!event?.is_recurring || !event?.recurrence_pattern) {
    return [event];
  }

  const occurrences: any[] = [];

  const startDate = new Date(event.date);
  if (Number.isNaN(startDate.getTime())) {
    return [event];
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const from = today;

  const to = new Date(today);
  to.setDate(to.getDate() + RECURRENCE_DAYS_AHEAD);
  to.setHours(23, 59, 59, 999);

  const recurrenceEnd = event.recurrence_end_date
    ? new Date(event.recurrence_end_date)
    : null;
  const end =
    recurrenceEnd && recurrenceEnd.getTime() < to.getTime()
      ? recurrenceEnd
      : to;

  switch (event.recurrence_pattern) {
    case "daily": {
      let d = new Date(Math.max(startDate.getTime(), from.getTime()));
      while (d.getTime() <= end.getTime()) {
        occurrences.push({
          ...event,
          date: d.toISOString().split("T")[0],
        });
        d.setDate(d.getDate() + 1);
      }
      break;
    }
    case "weekly":
    case "biweekly": {
      const stepWeeks = event.recurrence_pattern === "weekly" ? 1 : 2;
      const days: number[] =
        Array.isArray(event.recurrence_days) && event.recurrence_days.length > 0
          ? event.recurrence_days
          : [startDate.getDay()];

      // Find the first week start on/after "from"
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      const seriesStartWeekStart = new Date(startDate);
      seriesStartWeekStart.setDate(
        seriesStartWeekStart.getDate() - seriesStartWeekStart.getDay(),
      );
      seriesStartWeekStart.setHours(0, 0, 0, 0);

      const fromWeekStart = new Date(from);
      fromWeekStart.setDate(fromWeekStart.getDate() - fromWeekStart.getDay());
      fromWeekStart.setHours(0, 0, 0, 0);

      const diffWeeks = Math.floor(
        (fromWeekStart.getTime() - seriesStartWeekStart.getTime()) / weekMs,
      );
      const offsetWeeks =
        diffWeeks <= 0
          ? 0
          : diffWeeks % stepWeeks === 0
            ? diffWeeks
            : diffWeeks + (stepWeeks - (diffWeeks % stepWeeks));

      let currentWeekStart = new Date(
        seriesStartWeekStart.getTime() + offsetWeeks * weekMs,
      );

      while (currentWeekStart.getTime() <= end.getTime()) {
        for (const dow of days) {
          const d = new Date(currentWeekStart);
          d.setDate(currentWeekStart.getDate() + dow);
          if (d.getTime() < from.getTime() || d.getTime() > end.getTime()) {
            continue;
          }
          occurrences.push({
            ...event,
            date: d.toISOString().split("T")[0],
          });
        }
        currentWeekStart = new Date(
          currentWeekStart.getTime() + stepWeeks * weekMs,
        );
      }
      break;
    }
    case "monthly": {
      let d = new Date(startDate);
      // Move to first occurrence on/after "from"
      while (d.getTime() < from.getTime()) {
        d.setMonth(d.getMonth() + 1);
      }
      while (d.getTime() <= end.getTime()) {
        occurrences.push({
          ...event,
          date: d.toISOString().split("T")[0],
        });
        d.setMonth(d.getMonth() + 1);
      }
      break;
    }
    default:
      return [event];
  }

  return occurrences.length > 0 ? occurrences : [event];
}

interface UseEventsResult {
  events: EventCardData[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseEventsOptions {
  personalized?: boolean;
  userId?: string;
  searchQuery?: string;
  userLocation?: { latitude: number; longitude: number } | null;
  maxPrice?: number;
  eventType?: 'online' | 'onsite' | 'all';
  gender?: 'male' | 'female' | 'all';
}

export function useEvents(options: UseEventsOptions = {}): UseEventsResult {
  const supabase = useSupabaseClient();
  const { language } = useLanguage();
  const [events, setEvents] = useState<EventCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    personalized,
    userId,
    searchQuery,
    userLocation,
    maxPrice,
    eventType,
    gender
  } = options;
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // --- Location Detection Enhancement ---
      let activeLocation = userLocation;
      let detectedArea: string | null = null;

      if (!activeLocation) {
        const geoResult = await getGeoInfoByIP();
        if (geoResult?.latitude && geoResult?.longitude) {
          activeLocation = { latitude: geoResult.latitude, longitude: geoResult.longitude };
          detectedArea = geoResult.city;
          console.log(`[useEvents] Using IP location: ${detectedArea} (${activeLocation.latitude}, ${activeLocation.longitude})`);
        }
      }

      let userInterests: string[] = [];
      let userCurrencyCode: string | null = null;

      const loadUserProfile = async () => {
        if (!userId) return;
        const { data } = await supabase
          .from("users")
          .select("interested_tags,currency_code,currency_auto_detected")
          .eq("id", userId)
          .maybeSingle();

        console.log("👤 User Profile Loaded:", data);

        if (data?.interested_tags) {
          userInterests = data.interested_tags;
        }
        if (data?.currency_code) {
          userCurrencyCode = data.currency_code;
        }

        console.log("💰 Initial User Currency:", userCurrencyCode);

        // If currency is missing OR it's set to auto-detect, verify/update it
        if (!userCurrencyCode || data?.currency_auto_detected) {
          const detected = await autoDetectAndUpdateUserCurrency(
            supabase,
            userId,
            getCountryCodeFromLocale(),
          );
          console.log("💰 Auto-detected currency result:", detected);
          if (detected) {
            userCurrencyCode = detected;
          }
        }
      };

      if (userId) {
        await loadUserProfile();
      }

      // 1. Fetch all events with their tags and attendees
      // 1. Build the base query
      let queryBuilder = supabase.from("events").select(`
                    *,
                    organizer:users!events_organizer_id_fkey (
                        name,
                        image_url
                    ),
                    attendees (
                        user_id,
                        user:users (
                          image_url
                        )
                    ),
                    event_tags (
                        tags (
                            name,
                            tag_translations (
                                language_code,
                                name
                            )
                        )
                    )
                `);

      // 2. Apply status and date filters (only show active/upcoming events)
      const today = new Date().toISOString().split('T')[0];
      queryBuilder = queryBuilder
        .neq('status', 'ended')
        .neq('status', 'canceled')
        .gte('date', today);

      // 3. Apply search logic if searchQuery is provided
      if (searchQuery && searchQuery.trim().length > 0) {
        const trimmedQuery = searchQuery.trim();
        // Check title, location, and description for any keyword matches
        queryBuilder = queryBuilder.or(`title.ilike.%${trimmedQuery}%,location.ilike.%${trimmedQuery}%,description.ilike.%${trimmedQuery}%`);
      }

      // 4. Apply additional filters if provided
      if (maxPrice !== undefined && maxPrice !== null) {
        queryBuilder = queryBuilder.lte('price', maxPrice);
      }

      if (eventType === 'online') {
        queryBuilder = queryBuilder.eq('is_online', true);
      } else if (eventType === 'onsite') {
        queryBuilder = queryBuilder.eq('is_online', false);
      }

      if (gender && gender !== 'all') {
        queryBuilder = queryBuilder.eq('gender', gender);
      }

      const { data, error: fetchError } = await queryBuilder;

      if (fetchError) throw fetchError;

      let resultData = data || [];

      // 3. Personalize & Proximity: Use Edge Function if available, otherwise fallback to client-side logic
      if (personalized && userId) {
        try {
          const { data: personalizedData, error: funcError } = await supabase.functions.invoke('get-personalized-events', {
            body: {
              user_id: userId,
              location: activeLocation ? {
                latitude: activeLocation.latitude,
                longitude: activeLocation.longitude
              } : null,
              search_query: searchQuery,
              max_price: maxPrice,
              event_type: eventType,
              gender: gender,
              language: language
            }
          });

          if (!funcError && personalizedData && Array.isArray(personalizedData)) {
            resultData = personalizedData;
          } else {
            if (funcError) {
              console.log(`[useEvents] Edge function notice: ${funcError.message || 'Unauthorized or not configured'}`);
            }
            await performClientSidePersonalization();
          }
        } catch (e) {
          console.warn("Edge function call failed, falling back to client-side personalization:", e);
          await performClientSidePersonalization();
        }
      } else {
        await performClientSidePersonalization();
      }

      async function performClientSidePersonalization() {
        // Expand recurring events into upcoming occurrences
        const expandedEvents: any[] = [];
        for (const ev of resultData as any[]) {
          if (ev?.is_recurring) {
            expandedEvents.push(...generateRecurringOccurrences(ev));
          } else {
            expandedEvents.push(ev);
          }
        }

        // Sort by interest match and distance
        if ((personalized && userInterests.length > 0) || userLocation) {
          expandedEvents.sort((a: any, b: any) => {
            let interestScoreA = 0;
            let interestScoreB = 0;

            if (personalized && userInterests.length > 0) {
              const aTags = a.event_tags?.map((et: any) => et.tags?.name) || [];
              const bTags = b.event_tags?.map((et: any) => et.tags?.name) || [];
              const aMatch = aTags.some((tag: string) => userInterests.includes(tag));
              const bMatch = bTags.some((tag: string) => userInterests.includes(tag));

              if (aMatch) interestScoreA = -200;
              if (bMatch) interestScoreB = -200;
            }

            let distanceA = 0;
            let distanceB = 0;

            if (activeLocation) {
              const hasLocA = a.latitude !== null && a.latitude !== undefined && a.longitude !== null && a.longitude !== undefined;
              const hasLocB = b.latitude !== null && b.latitude !== undefined && b.longitude !== null && b.longitude !== undefined;

              distanceA = hasLocA
                ? getDistance(activeLocation.latitude, activeLocation.longitude, a.latitude, a.longitude)
                : 1000;

              distanceB = hasLocB
                ? getDistance(activeLocation.latitude, activeLocation.longitude, b.latitude, b.longitude)
                : 1000;

              // Prioritize same area/city name if detected
              if (detectedArea) {
                const cityLower = detectedArea.toLowerCase();
                const aLocLower = (a.location || "").toLowerCase();
                const bLocLower = (b.location || "").toLowerCase();
                if (aLocLower.includes(cityLower)) distanceA -= 50;
                if (bLocLower.includes(cityLower)) distanceB -= 50;
              }
            }

            const scoreA = interestScoreA + distanceA;
            const scoreB = interestScoreB + distanceB;

            return scoreA - scoreB;
          });
        }
        resultData = expandedEvents;
      }

      // 4. Build currency context for formatting and filtering
      const eventCurrencyCodes = (resultData || [])
        .map((event: any) => event?.currency_code)
        .filter(Boolean);
      const currencyContext = await buildCurrencyContext(
        supabase,
        userCurrencyCode,
        eventCurrencyCodes,
      );

      // 5. Apply manual filters that might have been missed by DB/Function (especially maxPrice across currencies)
      if (maxPrice !== undefined || eventType !== 'all' || (gender && gender !== 'all') || userLocation) {
        resultData = resultData.filter((event: any) => {
          // Filter by Event Type
          if (eventType === 'online' && !event.is_online) return false;
          if (eventType === 'onsite' && event.is_online) return false;

          // Filter by Gender
          if (gender && gender !== 'all' && event.gender && event.gender !== 'all' && event.gender !== gender) return false;

          // Filter by Distance (if location provided)
          if (activeLocation) {
            const hasLoc = event.latitude !== null && event.latitude !== undefined && event.longitude !== null && event.longitude !== undefined;
            if (hasLoc) {
              const dist = getDistance(activeLocation.latitude, activeLocation.longitude, event.latitude, event.longitude);
              if (dist > 50) return false; // Default 50km radius for search
            } else if (detectedArea) {
              // Fallback to city name filter if coordinates missing on event
              const cityLower = detectedArea.toLowerCase();
              const eventLocLower = (event.location || "").toLowerCase();
              if (!eventLocLower.includes(cityLower)) return false;
            }
          }

          // Filter by Max Price (handling multiple currencies)
          if (maxPrice !== undefined && maxPrice !== null) {
            const eventPrice = event.price || 0;
            const eventCode = event.currency_code || DEFAULT_CURRENCY_CODE;
            const rateToUser = currencyContext.rateToUserByCode[eventCode] ?? (eventCode === currencyContext.userCurrencyCode ? 1 : null);

            if (rateToUser !== null) {
              const priceInUserCurrency = eventPrice * rateToUser;
              if (priceInUserCurrency > maxPrice) return false;
            } else {
              // Fallback if rate missing: compare raw values if currencies match
              if (eventCode === currencyContext.userCurrencyCode && eventPrice > maxPrice) return false;
            }
          }

          return true;
        });
      }

      // 6. Map Supabase data to EventCardData format
      const mappedEvents = resultData.map((event: any) =>
        transformEventToCardData(event, userId, language, currencyContext),
      );

      // 7. De-duplicate events to prevent repeat cards
      const seen = new Set<string>();
      const uniqueById = mappedEvents.filter((event) => {
        const baseId = event.parentEventId || event.id;
        const key = `${baseId}|${event.rawDate || ""}|${event.time || ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Extra pass to catch duplicate rows with different ids but same content
      const seenContent = new Set<string>();
      const uniqueEvents = uniqueById.filter((event) => {
        const contentKey = [
          (event.title || "").toLowerCase(),
          event.rawDate || "",
          event.time || "",
          (event.location || "").toLowerCase(),
          event.organizerId || "",
          event.parentEventId || "",
        ].join("|");
        if (seenContent.has(contentKey)) return false;
        seenContent.add(contentKey);
        return true;
      });

      setEvents(uniqueEvents);
    } catch (err) {
      console.error("Error fetching events:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch events");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, personalized, userId, searchQuery, language, userLocation, maxPrice, eventType, gender]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, loading, error, refetch: fetchEvents };
}

interface UseEventResult {
  event: EventCardData | null;
  loading: boolean;
  error: string | null;
}

export function useEvent(id: string): UseEventResult {
  const supabase = useSupabaseClient();
  const { language } = useLanguage();
  const { user } = useUser();
  const [event, setEvent] = useState<EventCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvent() {
      try {
        console.log("🔍 Fetching event with ID:", id);
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from("events")
          .select(
            `
                        *,
                        organizer:users!events_organizer_id_fkey (
                            name,
                            image_url
                        ),
                        attendees (
                            user_id,
                            user:users (
                              image_url
                            )
                        ),
                        event_tags (
                            tags (
                                name,
                                tag_translations (
                                    language_code,
                                    name
                                )
                            )
                        )
                    `,
          )
          .eq("id", id)
          .single();

        if (fetchError) {
          console.error("❌ Supabase fetch error:", fetchError);
          throw fetchError;
        }

        // Log the raw data from Supabase to debug
        console.log("✅ Raw event data from Supabase:", JSON.stringify(data, null, 2));

        // Handle case where data might be an array (even though we used .single())
        let eventData = data;
        if (Array.isArray(data) && data.length > 0) {
          console.log("⚠️ Data is an array, extracting first element");
          eventData = data[0];
        }

        let userCurrencyCode: string | null = null;
        if (user?.id) {
          const { data: userRow } = await supabase
            .from("users")
            .select("currency_code,currency_auto_detected")
            .eq("id", user.id)
            .maybeSingle();

          if (userRow?.currency_code) {
            userCurrencyCode = userRow.currency_code;
          }

          if (!userCurrencyCode || userRow?.currency_auto_detected) {
            const detected = await autoDetectAndUpdateUserCurrency(
              supabase,
              user.id,
              getCountryCodeFromLocale(),
            );
            if (detected) {
              userCurrencyCode = detected;
            }
          }
        }

        const currencyContext = await buildCurrencyContext(
          supabase,
          userCurrencyCode,
          [eventData?.currency_code],
        );

        // Map Supabase data (Pass userId if available for attendance check)
        const mappedEvent = transformEventToCardData(
          eventData,
          user?.id || null,
          language,
          currencyContext,
        );

        console.log("✅ Mapped event data:", mappedEvent);
        setEvent(mappedEvent);
      } catch (err) {
        console.error("❌ Error fetching event:", err);
        console.error("❌ Error details:", JSON.stringify(err, null, 2));
        setError(err instanceof Error ? err.message : "Failed to fetch event");
        const dummyEvent = EVENTS.find((e) => e.id === id);
        console.log("⚠️ Falling back to dummy event:", dummyEvent);
        setEvent(dummyEvent ? (dummyEvent as any) : null);
      } finally {
        setLoading(false);
      }
    }

    const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    if (id && id !== "undefined" && isUUID(id)) {
      fetchEvent();
    } else {
      setLoading(false);
    }
  }, [id, supabase, language, user?.id]);

  return { event, loading, error };
}

interface UseTagsResult {
  tags: string[];
  loading: boolean;
  error: string | null;
  tagObjects: Array<{ id: number; name: string; label: string }>;
  refetch: () => Promise<void>;
}

export function useTags(): UseTagsResult {
  const supabase = useSupabaseClient();
  const { language, t } = useLanguage();
  const [tags, setTags] = useState<string[]>([]);
  const [tagObjects, setTagObjects] = useState<Array<{ id: number; name: string; label: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("tags")
        .select("id, name, tag_translations(language_code, name)");

      if (fetchError) throw fetchError;

      const allLabel = t("create_event_gender_all") || "All";
      const nearMeLabel = t("location_near_me") || "Near me";

      const objects = data.map((tag: any) => {
        let label = tag.name;
        if (language !== "en") {
          let tr = tag.tag_translations?.find((tr: any) => tr.language_code === language);
          if (!tr && language === "ar-EG") {
            tr = tag.tag_translations?.find((tr: any) => tr.language_code === "ar");
          }
          if (tr) label = tr.name;
        }

        return {
          id: tag.id,
          name: tag.name,
          label: label
        };
      });

      setTagObjects(objects);
      setTags([allLabel, nearMeLabel, ...objects.map((o: any) => o.label)]);
    } catch (err) {
      console.error("Error fetching tags:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch tags");
      // Fallback
      setTags(TAGS);
      setTagObjects(TAGS.map((t, i) => ({ id: i, name: t, label: t })));
    } finally {
      setLoading(false);
    }
  }, [supabase, language, t]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  return { tags, tagObjects, loading, error, refetch: fetchTags };
}
