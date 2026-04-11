import { useUser } from "@clerk/clerk-expo";
import { useCallback, useEffect, useState } from "react";
import { useCurrency } from "../lib/CurrencyContext";
import { useLanguage } from "../lib/i18n";
import { useSupabaseClient } from "../lib/supabaseConfig";
import { EventCardData, transformEventToCardData } from "../types/database";
import { DEFAULT_CURRENCY_CODE } from "../utils/currency";
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

  const { selectedCurrency, exchangeRates, refreshRates, currencyInfo } = useCurrency();

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let activeLocation = userLocation;
      let detectedArea: string | null = null;

      if (!activeLocation) {
        const geoResult = await getGeoInfoByIP();
        if (geoResult?.latitude && geoResult?.longitude) {
          activeLocation = { latitude: geoResult.latitude, longitude: geoResult.longitude };
          detectedArea = geoResult.city;
        }
      }

      let userInterests: string[] = [];

      const loadUserProfile = async () => {
        if (!userId) return;
        const { data } = await supabase
          .from("users")
          .select("interested_tags")
          .eq("id", userId)
          .maybeSingle();

        if (data?.interested_tags) {
          userInterests = data.interested_tags;
        }
      };

      if (userId) {
        await loadUserProfile();
      }

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

      const now = new Date();
      const todayStr = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0')
      ].join('-');

      queryBuilder = queryBuilder
        .neq('status', 'ended')
        .neq('status', 'canceled')
        .or(`date.gte.${todayStr},end_date.gte.${todayStr}`);

      if (searchQuery && searchQuery.trim().length > 0) {
        const trimmedQuery = searchQuery.trim();
        queryBuilder = queryBuilder.or(`title.ilike.%${trimmedQuery}%,location.ilike.%${trimmedQuery}%,description.ilike.%${trimmedQuery}%`);
      }

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
            await performClientSidePersonalization();
          }
        } catch (e) {
          await performClientSidePersonalization();
        }
      } else {
        await performClientSidePersonalization();
      }

      async function performClientSidePersonalization() {
        const expandedEvents: any[] = [];
        for (const ev of resultData as any[]) {
          if (ev?.is_recurring) {
            expandedEvents.push(...generateRecurringOccurrences(ev));
          } else {
            expandedEvents.push(ev);
          }
        }

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

              if (detectedArea) {
                const cityLower = detectedArea.toLowerCase();
                const aLocLower = (a.location || "").toLowerCase();
                const bLocLower = (b.location || "").toLowerCase();
                if (aLocLower.includes(cityLower)) distanceA -= 50;
                if (bLocLower.includes(cityLower)) distanceB -= 50;
              }
            }

            return (interestScoreA + distanceA) - (interestScoreB + distanceB);
          });
        }
        resultData = expandedEvents;
      }

      const eventCodes = Array.from(new Set(resultData.map((e: any) => e.currency_code).filter(Boolean))) as string[];
      if (eventCodes.length > 0) {
        const needed = eventCodes.filter(c => c !== selectedCurrency && !exchangeRates[c]);
        if (needed.length > 0) await refreshRates(needed);
      }

      const currencyContext = {
        userCurrencyCode: selectedCurrency,
        userCurrency: currencyInfo,
        currencyByCode: { [selectedCurrency]: currencyInfo! },
        rateToUserByCode: { [selectedCurrency]: 1, ...exchangeRates },
      };

      if (maxPrice !== undefined || eventType !== 'all' || (gender && gender !== 'all') || userLocation) {
        resultData = resultData.filter((event: any) => {
          if (eventType === 'online' && !event.is_online) return false;
          if (eventType === 'onsite' && event.is_online) return false;
          if (gender && gender !== 'all' && event.gender && event.gender !== 'all' && event.gender !== gender) return false;

          if (activeLocation) {
            const hasLoc = event.latitude !== null && event.latitude !== undefined && event.longitude !== null && event.longitude !== undefined;
            if (hasLoc) {
              const dist = getDistance(activeLocation.latitude, activeLocation.longitude, event.latitude, event.longitude);
              event.distance = dist;
              if (!personalized && dist > 100) return false;
            }
          }

          if (maxPrice !== undefined && maxPrice !== null) {
            const eventPrice = event.price || 0;
            const eventCode = event.currency_code || DEFAULT_CURRENCY_CODE;
            const rate = currencyContext.rateToUserByCode[eventCode];
            if (rate !== undefined) {
              if (eventPrice * rate > maxPrice) return false;
            }
          }
          return true;
        });
      }

      const mappedEvents = resultData.map((event: any) =>
        transformEventToCardData(event, userId, language, currencyContext),
      );

      const seen = new Set<string>();
      const uniqueEvents = mappedEvents.filter((event) => {
        const baseId = event.id;
        const key = event.isRecurring ? `${baseId}|${event.rawDate}` : baseId;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setEvents(uniqueEvents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch events");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, personalized, userId, searchQuery, language, userLocation, maxPrice, eventType, gender, selectedCurrency, exchangeRates, refreshRates, currencyInfo]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, loading, error, refetch: fetchEvents };
}

export function useEvent(id: string): { event: EventCardData | null; loading: boolean; error: string | null } {
  const supabase = useSupabaseClient();
  const { language } = useLanguage();
  const { user } = useUser();
  const [event, setEvent] = useState<EventCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectedCurrency, exchangeRates, refreshRates, currencyInfo } = useCurrency();

  useEffect(() => {
    async function fetchEvent() {
      try {
        setLoading(true);
        setError(null);
        const { data, error: fetchError } = await supabase.from("events").select(`
                    *,
                    organizer:users!events_organizer_id_fkey (name, image_url),
                    attendees (user_id, user:users (image_url)),
                    event_tags (tags (name, tag_translations (language_code, name)))
                `).eq("id", id).maybeSingle();

        if (fetchError || !data) throw fetchError || new Error("Event not found");

        if (data.currency_code && data.currency_code !== selectedCurrency && !exchangeRates[data.currency_code]) {
          await refreshRates([data.currency_code]);
        }

        const currencyContext = {
          userCurrencyCode: selectedCurrency,
          userCurrency: currencyInfo,
          currencyByCode: { [selectedCurrency]: currencyInfo! },
          rateToUserByCode: { [selectedCurrency]: 1, ...exchangeRates },
        };

        setEvent(transformEventToCardData(data, user?.id || null, language, currencyContext));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch event");
      } finally {
        setLoading(false);
      }
    }
    if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) fetchEvent();
    else setLoading(false);
  }, [id, supabase, language, user?.id, selectedCurrency, exchangeRates, refreshRates, currencyInfo]);

  return { event, loading, error };
}

export function useTags(): { tags: string[]; tagObjects: any[]; loading: boolean; error: string | null; refetch: () => Promise<void> } {
  const supabase = useSupabaseClient();
  const { language, t } = useLanguage();
  const [tagObjects, setTagObjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase.from("tags").select("id, name, tag_translations(language_code, name)");
      if (fetchError) throw fetchError;

      const objects = data.map((tag: any) => {
        let label = tag.name;
        const tr = tag.tag_translations?.find((t: any) => t.language_code === (language === "ar-EG" ? "ar" : language));
        if (tr) label = tr.name;
        return { id: tag.id, name: tag.name, label };
      });

      setTagObjects(objects);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch tags");
    } finally {
      setLoading(false);
    }
  }, [supabase, language]);

  useEffect(() => { fetchTags(); }, [fetchTags]);

  return {
    tags: [t("create_event_gender_all") || "All", t("location_near_me") || "Near me", ...tagObjects.map(o => o.label)],
    tagObjects,
    loading,
    error,
    refetch: fetchTags
  };
}
