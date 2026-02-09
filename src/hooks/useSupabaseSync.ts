// hooks/useSupabaseSync.js
import { useUser } from "@clerk/clerk-expo";
import { useEffect } from "react";
import { useSupabaseClient } from "../lib/supabaseConfig";

export function useSupabaseSync() {
  const { user, isLoaded } = useUser();
  const supabase = useSupabaseClient();

  useEffect(() => {
    if (!isLoaded || !user) return;

    const syncUser = async () => {
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

        const userData = {
          id: user.id,
          email: user.primaryEmailAddress?.emailAddress,
          name: user.fullName,
          image_url: finalImageUrl,
          date_signed_in: new Date().toISOString(),
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
