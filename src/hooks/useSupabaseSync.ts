// hooks/useSupabaseSync.js
import { useUser } from "@clerk/clerk-expo";
import { useEffect } from "react";
import { useSupabaseClient } from "../lib/supabaseConfig";
import { autoDetectAndUpdateUserCurrency, getCountryCodeFromLocale } from "../utils/currency";
import { getGeoInfoByIP } from "../utils/ip";



export function useSupabaseSync() {
  const { user, isLoaded } = useUser();
  const supabase = useSupabaseClient();

  useEffect(() => {
    if (!isLoaded || !user) return;

    const syncUser = async () => {
      let ipCountry: string | null = null;
      try {
        // 1. Check if user exists
        const { data: existingUser, error: fetchError } = await supabase
          .from("users")
          .select("id, image_url")
          .eq("id", user.id)
          .maybeSingle();

        if (fetchError) throw fetchError;

        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
        const hasSupabaseImage = !!(existingUser?.image_url?.includes(supabaseUrl || ""));
        const finalImageUrl = hasSupabaseImage ? existingUser?.image_url : user.imageUrl;

        let latitude: number | null = null;
        let longitude: number | null = null;
        try {
          const geoInfo = await getGeoInfoByIP();
          if (geoInfo) {
            latitude = geoInfo.latitude;
            longitude = geoInfo.longitude;
            ipCountry = geoInfo.country;
          }
        } catch (e) {
          console.log('[useSupabaseSync] Geolocation detection failed');
        }

        const userData = {
          id: user.id,
          email: user.primaryEmailAddress?.emailAddress,
          name: user.fullName,
          image_url: finalImageUrl,
          date_signed_in: new Date().toISOString(),
          latitude: latitude,
          longitude: longitude,
          country_code: ipCountry,
        };

        if (existingUser) {
          // 2. If exists, UPDATE
          const { error: updateError } = await supabase
            .from("users")
            .update(userData)
            .eq("id", user.id);
          if (updateError) throw updateError;
        } else {
          // 3. If not, INSERT
          const { error: insertError } = await supabase
            .from("users")
            .insert(userData);
          if (insertError) throw insertError;
        }

        console.log("Supabase Sync Success!");
      } catch (error) {
        console.error("Supabase Sync Error:", error);
      }

      try {
        if (user?.id) {
          await autoDetectAndUpdateUserCurrency(
            supabase,
            user.id,
            ipCountry || getCountryCodeFromLocale(),
          );
        }
      } catch (currencyError) {
        console.warn("Currency auto-detect failed:", currencyError);
      }

      // Initialize notification preferences if they don't exist
      const { data: existingPrefs } = await supabase
        .from("notification_preferences")
        .select("user_id")
        .eq("user_id", user.id)
        .single();

      if (!existingPrefs) {
        await supabase.from("notification_preferences").insert({
          user_id: user.id,
          push_enabled: true,
          new_attendee: true,
          attendee_cancel: true,
          event_reminders: true,
          questions: true,
          new_events_nearby: true,
          event_stats: true,
        });
      }
    };

    syncUser();
  }, [user?.id, isLoaded, supabase]);
}
