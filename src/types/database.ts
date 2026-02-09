// Database types matching Supabase schema

export interface DBUser {
  id: string; // From Clerk or Auth
  email: string | null;
  name: string | null;
  image_url: string | null;
  created_at: string;
  last_location: string | null;
  interested_tags: string[] | null;
  total_revenue: number;
  date_signed_in: string;
  total_spend: number;
}

export interface DBTag {
  id: number;
  name: string;
  category: string;
  created_at: string;
}

export interface DBEvent {
  id: string; // uuid
  title: string;
  organizer_id: string | null;
  max_capacity: number | null;
  price: number;
  location: string | null;
  is_online: boolean;
  link: string | null;
  date: string; // date
  time: string; // time
  end_time: string | null; // time
  end_date: string | null; // date
  created_at: string;
  image_url: string | null;
  description?: string | null;
  is_recurring?: boolean;
  recurrence_pattern?: "daily" | "weekly" | "biweekly" | "monthly" | "custom" | null;
  recurrence_days?: number[] | null;
  recurrence_end_date?: string | null;
  parent_event_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  gender?: "male" | "female" | "all" | null;
  status?: "active" | "canceled" | "ended" | null;
  cancellation_reason?: string | null;
  is_promoted?: boolean | null;
}

export interface DBAttendee {
  event_id: string;
  user_id: string;
  joined_at: string;
}

export interface DBEventTag {
  event_id: string;
  tag_id: number;
}

export interface DBSession {
  id: string;
  user_id: string | null;
  session_start: string;
  session_end: string | null;
  actions: any; // jsonb
  power_score: number;
}

export interface DBUserInterest {
  user_id: string;
  tag_id: number;
}

// Derived type for EventCard component (maps database fields to UI needs)
export interface EventCardData {
  id: string;
  title: string;
  organizer: string;
  organizerId: string | null;
  organizerImage: string | null;
  location: string;
  day: string;
  time: string;
  gender: string;
  image: string;
  price: string;
  attendingAvatars: string[];
  attendingCount: number;
  tags: string[];
  description: string;
  latitude: number | null;
  longitude: number | null;
  rawDate: string;
  isAttending?: boolean;
  isOnline: boolean;
  link: string | null;
  status: "active" | "canceled" | "ended";
  cancellationReason: string | null;
  isRecurring?: boolean;
  recurrencePattern?: "daily" | "weekly" | "biweekly" | "monthly" | "custom" | null;
  recurrenceDays?: number[] | null;
  isPromoted?: boolean;
}

// Helper function to transform database Event to EventCardData
export function transformEventToCardData(
  event: DBEvent & {
    organizer?: { name: string | null; image_url: string | null } | null;
    attendees?: {
      user_id: string;
      user?: { image_url: string | null } | null;
    }[];
    event_tags?: {
      tags: {
        name: string;
        tag_translations?: { language_code: string; name: string }[];
      } | null
    }[];
  },
  currentUserId?: string | null,
  language: string = "en",
): EventCardData {
  // Log the raw event data for debugging
  /* 
  console.log("Transforming event:", {
    id: event.id,
    title: event.title,
    date: event.date,
    time: event.time,
    price: event.price,
    organizer: event.organizer,
    organizer_id: event.organizer_id,
    is_online: event.is_online,
    link: event.link,
  });
  */

  // Handle date formatting with fallback
  let dayName = "Invalid Date";
  try {
    if (event.date) {
      const dateObj = new Date(event.date);
      if (!isNaN(dateObj.getTime())) {
        dayName = dateObj.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
          weekday: "long",
        });
      }
    }
  } catch (e) {
    console.error("Error formatting date:", e);
  }

  // Format time (assuming time is in HH:mm:ss format from Postgres)
  let formattedTime = "Invalid Time";
  try {
    if (event.time) {
      const timeStr = String(event.time);
      const [hours, minutes] = timeStr.split(":");
      const h = parseInt(hours);
      if (!isNaN(h)) {
        const ampm = h >= 12 ? "PM" : "AM";
        const displayH = h % 12 || 12;
        formattedTime = `${displayH}:${minutes || "00"} ${ampm}`;
      }
    }
  } catch (e) {
    console.error("Error formatting time:", e);
  }

  // Handle price with proper null/undefined checks
  let priceStr = "Free";
  try {
    const priceValue = event.price;
    if (priceValue !== null && priceValue !== undefined) {
      const numPrice = Number(priceValue);
      if (!isNaN(numPrice)) {
        priceStr = numPrice === 0 ? (language === 'ar' ? "مجاني" : "Free") : (language === 'ar' ? `${numPrice} ج.م` : `$${numPrice.toFixed(2)}`);
      }
    }
  } catch (e) {
    console.error("Error formatting price:", e);
  }

  // Get attendee images or fallback colors
  const avatarColors = event.attendees
    ?.map((a) => a.user?.image_url)
    .filter((url): url is string => !!url)
    .slice(0, 5) || [];

  // If no images found but there are attendees, fall back to colors (or mixed)
  // For now, if we have fewer images than attendees (e.g. some users have no image),
  // we might want to fill with a placeholder or color.
  // But to keep it simple and match "user signed image" request, let's just use what we found.
  // If list is empty but count > 0, we can use a fallback color.
  if (avatarColors.length === 0 && (event.attendees?.length || 0) > 0) {
    // Add one fallback color if no one has an image but people are attending
    avatarColors.push("#401CB5");
  }

  const isAttending = currentUserId
    ? event.attendees?.some(a => a.user_id === currentUserId)
    : false;

  // Get organizer name and image with better handling
  let organizerName = "Unknown";
  let organizerImageUrl: string | null = null;

  if (event.organizer && !Array.isArray(event.organizer)) {
    organizerName = event.organizer.name || "Unknown";
    organizerImageUrl = event.organizer.image_url || null;
  }

  return {
    id: event.id,
    title: event.title || "Untitled Event",
    organizer: organizerName,
    organizerId: event.organizer_id || null,
    organizerImage: organizerImageUrl,
    location: event.location || (language === 'ar' ? "أونلاين" : "Online"),
    day: dayName,
    time: formattedTime,
    gender: event.gender || "all",
    image:
      event.image_url ||
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=250&fit=crop",
    price: priceStr,
    attendingAvatars: avatarColors,
    attendingCount: event.attendees?.length || 0,
    tags:
      event.event_tags
        ?.map((et) => {
          const tagName = et.tags?.name;
          if (!tagName) return null;

          if (language === "en") return tagName;

          const translation = et.tags?.tag_translations?.find(
            (t) => t.language_code === language
          );
          return translation?.name || tagName;
        })
        .filter((t): t is string => !!t) || [],
    description: event.description || "",
    latitude: event.latitude ?? null,
    longitude: event.longitude ?? null,
    rawDate: event.date || "",
    isAttending,
    isOnline: !!event.is_online,
    link: event.link || null,
    status: event.status || "active",
    cancellationReason: event.cancellation_reason || null,
    isRecurring: event.is_recurring || false,
    recurrencePattern: event.recurrence_pattern || null,
    recurrenceDays: event.recurrence_days || null,
    isPromoted: !!(event as any).is_promoted || !!(event as any).isPromoted,
  };
}
