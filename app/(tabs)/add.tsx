import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../src/components/Button";
import { PromotedButton } from "../../src/components/PromotedButton";
import { PromoteEventModal } from "../../src/components/PromoteEventModal";
import { PromotionBottomSheet } from "../../src/components/PromotionBottomSheet";
import { Colors } from "../../src/constants/Colors";
import { PROMOTIONS_ENABLED } from "../../src/constants/FeatureFlags";
import { Fonts } from "../../src/constants/Fonts";
import { useTags } from "../../src/hooks/useEvents";
import { useTrackSession } from "../../src/hooks/useTrackSession";
import { useAlert } from "../../src/lib/AlertContext";
import { useLanguage } from "../../src/lib/i18n";
import { notificationManager } from "../../src/lib/NotificationManager";
import { useSupabaseClient } from "../../src/lib/supabaseConfig";

type EventType = "online" | "onsite" | "";

type MapboxPlaceSuggestion = {
  id: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
};

export default function AddScreen() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const supabase = useSupabaseClient();
  const router = useRouter();
  const params = useLocalSearchParams();
  const editId = (params?.editId as string) || undefined;
  const isEditMode = !!editId;
  const { tags: allTagsFromDB, tagObjects } = useTags();
  const { t, language } = useLanguage();
  const { showAlert } = useAlert();
  const { trackAction } = useTrackSession();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<EventType>("");
  const [location, setLocation] = useState("");
  const [eventLink, setEventLink] = useState("");
  const [cost, setCost] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [eventTime, setEventTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [maxCapacity, setMaxCapacity] = useState("");
  const [gender, setGender] = useState("All");

  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [isEndDatePickerVisible, setEndDatePickerVisibility] = useState(false);
  const [isTimePickerVisible, setTimePickerVisibility] = useState(false);
  const [isEndTimePickerVisible, setEndTimePickerVisibility] = useState(false);

  const [tagInput, setTagInput] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  // Location search (Mapbox autocomplete)
  const [locationSuggestions, setLocationSuggestions] = useState<
    MapboxPlaceSuggestion[]
  >([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [selectedLocationCoords, setSelectedLocationCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Simple weekly recurrence flag
  const [isRecurringWeekly, setIsRecurringWeekly] = useState(false);

  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [showPromotionSheet, setShowPromotionSheet] = useState(false);
  const [savedEventId, setSavedEventId] = useState<string | null>(null);

  const [initialLoading, setInitialLoading] = useState(false);

  const [image, setImage] = useState<string | null>(null);

  const hasLocationApiKey = !!process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

  // Filter tags based on input
  const handleTagInputChange = useCallback(
    (text: string) => {
      setTagInput(text);
      if (text.trim()) {
        const filtered = tagObjects.filter(
          (tObj) =>
            (tObj.label.toLowerCase().includes(text.toLowerCase()) || 
             tObj.name.toLowerCase().includes(text.toLowerCase())) &&
            !selectedTags.includes(tObj.name)
        );
        setSuggestedTags(filtered.map(f => f.label));
        setShowTagSuggestions(filtered.length > 0);
      } else {
        setSuggestedTags([]);
        setShowTagSuggestions(false);
      }
    },
    [tagObjects, selectedTags],
  );

  const addTag = (tagLabel: string) => {
    const tObj = tagObjects.find(t => t.label === tagLabel);
    const tagName = tObj ? tObj.name : tagLabel;
    
    if (!selectedTags.includes(tagName)) setSelectedTags([...selectedTags, tagName]);
    setTagInput("");
    setSuggestedTags([]);
    setShowTagSuggestions(false);
  };

  const addCustomTag = () => {
    const tag = tagInput.trim();
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
      setTagInput("");
      setSuggestedTags([]);
      setShowTagSuggestions(false);
    }
  };

  const removeTag = (tag: string) => {
    setSelectedTags(selectedTags.filter((t) => t !== tag));
  };

  const fetchLocationSuggestions = useCallback(
    async (text: string) => {
      const query = text.trim();
      if (!query) {
        setLocationSuggestions([]);
        setShowLocationSuggestions(false);
        return;
      }

      const apiKey = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
      if (!apiKey) {
        console.warn(
          "EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN is not set. Location search is disabled.",
        );
        setLocationSuggestions([]);
        setShowLocationSuggestions(false);
        return;
      }

      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            query,
          )}.json?access_token=${apiKey}&autocomplete=true&limit=5`,
        );
        const json = await response.json();

        if (!json.features || !Array.isArray(json.features)) {
          setLocationSuggestions([]);
          setShowLocationSuggestions(false);
          return;
        }

        const suggestions: MapboxPlaceSuggestion[] = json.features
          .slice(0, 5)
          .map((f: any) => ({
            id: f.id,
            description: f.place_name,
            latitude:
              Array.isArray(f.center) && typeof f.center[1] === "number"
                ? f.center[1]
                : null,
            longitude:
              Array.isArray(f.center) && typeof f.center[0] === "number"
                ? f.center[0]
                : null,
          }));

        setLocationSuggestions(suggestions);
        setShowLocationSuggestions(suggestions.length > 0);
      } catch (err) {
        console.error("Location autocomplete error:", err);
        setLocationSuggestions([]);
        setShowLocationSuggestions(false);
      }
    },
    [],
  );

  const handleSelectLocationSuggestion = useCallback(
    async (suggestion: MapboxPlaceSuggestion) => {
      setLocation(suggestion.description);

      if (
        typeof suggestion.latitude === "number" &&
        typeof suggestion.longitude === "number"
      ) {
        setSelectedLocationCoords({
          latitude: suggestion.latitude,
          longitude: suggestion.longitude,
        });
      }

      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
    },
    [],
  );

  const handleLocationChange = (text: string) => {
    if (eventType === "online") {
      setEventLink(text);
      return;
    }
    setLocation(text);
    setSelectedLocationCoords(null);
    fetchLocationSuggestions(text);
  };

  // Load event details when editing
  useEffect(() => {
    const loadEventForEdit = async () => {
      if (!editId) return;
      if (!user) {
        showAlert({
          title: t("error_title"),
          message: t("create_event_edit_login_required"),
          type: 'error',
        });
        router.back();
        return;
      }

      setInitialLoading(true);
      try {
        const { data, error } = await supabase
          .from("events")
          .select(
            `
            *,
            event_tags (
              tags (
                name
              )
            )
          `,
          )
          .eq("id", editId)
          .single();

        if (error) throw error;

        if (data.organizer_id && data.organizer_id !== user.id) {
          showAlert({
            title: t("create_event_edit_not_allowed"),
            message: t("create_event_edit_not_allowed_msg"),
            type: 'error',
          });
          router.back();
          return;
        }

        setTitle(data.title || "");
        setDescription(data.description || "");
        const typeFromDb: EventType = data.is_online ? "online" : "onsite";
        setEventType(typeFromDb);
        setLocation(data.location || "");
        setEventLink(data.link || "");
        setCost(
          typeof data.price === "number" ? String(data.price) : data.price || "",
        );
        setMaxCapacity(
          typeof data.max_capacity === "number"
            ? String(data.max_capacity)
            : data.max_capacity || "",
        );
        setGender(
          data.gender === "male"
            ? "Males"
            : data.gender === "female"
              ? "Females"
              : "All",
        );

        if (data.image_url) {
          setImage(data.image_url);
        }

        if (data.date) {
          const dateObj = new Date(data.date);
          if (!Number.isNaN(dateObj.getTime())) {
            setStartDate(dateObj);
          }
        }

          if (data.time) {
            const [hours, minutes] = data.time.split(":");
            const now = new Date();
            now.setHours(parseInt(hours || "0", 10));
            now.setMinutes(parseInt(minutes || "0", 10));
            now.setSeconds(0);
            now.setMilliseconds(0);
            setEventTime(now);
          }

          if (data.end_time) {
            const [hours, minutes] = data.end_time.split(":");
            const now = new Date();
            now.setHours(parseInt(hours || "0", 10));
            now.setMinutes(parseInt(minutes || "0", 10));
            now.setSeconds(0);
            now.setMilliseconds(0);
            setEndTime(now);
          }

          if (data.end_date) {
            const dateObj = new Date(data.end_date);
            if (!Number.isNaN(dateObj.getTime())) {
              setEndDate(dateObj);
            }
          }

        if (typeof data.latitude === "number" && typeof data.longitude === "number") {
          setSelectedLocationCoords({
            latitude: data.latitude,
            longitude: data.longitude,
          });
        }

        const tagNames =
          data.event_tags
            ?.map((et: any) => et.tags?.name)
            .filter((t: string | null) => !!t) || [];
        setSelectedTags(tagNames);
      } catch (err: any) {
        console.error("Load event for edit error:", err);
        showAlert({
          title: "Error",
          message: t("error_generic"),
          type: 'error',
        });
        router.back();
      } finally {
        setInitialLoading(false);
      }
    };

    loadEventForEdit();
  }, [editId, supabase, router, user, showAlert]);

  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const picked = new Date(date);
    picked.setHours(0, 0, 0, 0);
    return picked < today;
  };

  const handleConfirmDate = (date: Date) => {
    if (isPastDate(date)) {
      showAlert({
        title: t("error_past_date_title"),
        message: t("error_past_date_message"),
        type: 'warning',
      });
      setDatePickerVisibility(false);
      return;
    }
    setStartDate(date);
    setDatePickerVisibility(false);
  };
  const handleConfirmEndDate = (date: Date) => {
    if (isPastDate(date)) {
      showAlert({
        title: t("error_past_date_title"),
        message: t("error_past_date_message"),
        type: 'warning',
      });
      setEndDatePickerVisibility(false);
      return;
    }
    setEndDate(date);
    setEndDatePickerVisibility(false);
  };
  const handleConfirmTime = (date: Date) => {
    setEventTime(date);
    setTimePickerVisibility(false);
  };
  const handleConfirmEndTime = (date: Date) => {
    setEndTime(date);
    setEndTimePickerVisibility(false);
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAlert({
        title: t("error_past_date_title"),
        message: t("error_permission_photos"),
        type: 'warning',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImage(result.assets[0].uri);
    }
  };

  const uploadImageIfNeeded = async (): Promise<string | null> => {
    if (!image) return null;

    try {
      // If image is already a remote URL, reuse it
      if (image.startsWith("http")) {
        return image;
      }

      const extMatch = /\.([a-zA-Z0-9]+)$/.exec(image);
      const fileExt = (extMatch ? extMatch[1] : "jpg").toLowerCase();
      const fileName = `${Date.now()}.${fileExt}`;
      const contentType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;

      console.log(`[Event Banner] Starting manual upload for: ${fileName}`);

      const formData = new FormData();
      formData.append('file', {
        uri: image,
        name: fileName,
        type: contentType,
      } as any);

      const token = await getToken({ template: 'supabase' });
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      
      console.log(`[Event Banner] Uploading to ${supabaseUrl}/storage/v1/object/event_pic/${fileName}`);

      const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/event_pic/${fileName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-upsert': 'false', 
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error(`[Event Banner] Upload failed: ${uploadResponse.status} - ${errorText}`);
        throw new Error(`Upload failed: ${errorText}`);
      }

      const uploadData = await uploadResponse.json();
      console.log("[Event Banner] Upload Success:", uploadData);

      const { data: publicUrlData } = supabase.storage
        .from("event_pic")
        .getPublicUrl(fileName);

      if (!publicUrlData?.publicUrl) {
         throw new Error("Failed to get public URL for uploaded image.");
      }

      console.log("Image uploaded successfully:", publicUrlData.publicUrl);
      return publicUrlData.publicUrl;
    } catch (err: any) {
      console.error("Image upload processing error:", err);
      throw err;
    }
  };

    const resetForm = () => {
      setTitle("");
      setDescription("");
      setEventType("");
      setLocation("");
      setEventLink("");
      setCost("");
      setStartDate(null);
      setEndDate(null);
      setEventTime(null);
      setEndTime(null);
      setMaxCapacity("");
      setGender("All");
      setImage(null);
      setSelectedTags([]);
      setTagInput("");
      setIsRecurringWeekly(false);
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      setSelectedLocationCoords(null);
    };

    const handleDelete = async () => {
      if (!editId) return;
  
      showAlert({
        title: t("create_event_delete_confirm_title"),
        message: t("create_event_delete_confirm_message"),
        type: 'warning',
        buttons: [
          { text: t("btn_cancel"), style: "cancel" },
          {
            text: t("create_event_delete"),
            style: "destructive",
            onPress: async () => {
              setIsLoading(true);
              try {
                const { error } = await supabase
                  .from("events")
                  .delete()
                  .eq("id", editId);
  
                if (error) throw error;
                trackAction("delete_event", { eventId: editId });
                notificationManager.setHasUnreadEvents(true);
                router.replace("/(tabs)");
              } catch (err: any) {
                console.error("Delete error:", err);
                 showAlert({
                  title: t("error_generic"),
                  message: err.message,
                  type: 'error',
                });
              } finally {
                setIsLoading(false);
              }
            },
          },
        ],
      });
    };


    const handlePublish = async () => {
    if (!title.trim() || !eventType || !startDate || !eventTime) {
      showAlert({
        title: t("error_past_date_title"),
        message: t("error_required_fields"),
        type: 'warning',
      });
      return;
    }
    if (eventType === "onsite") {
      if (!location.trim()) {
        showAlert({
          title: t("error_past_date_title"),
          message: t("error_location_required_onsite"),
          type: 'warning',
        });
        return;
      }
      if (hasLocationApiKey && !selectedLocationCoords) {
        showAlert({
          title: t("error_past_date_title"),
          message: t("error_location_google_required"),
          type: 'warning',
        });
        return;
      }
    }
    if (eventType === "online" && !eventLink.trim()) {
      showAlert({
        title: t("error_past_date_title"),
        message: t("error_link_required_online"),
        type: 'warning',
      });
      return;
    }
    if (eventType === "online") {
      const trimmedLink = eventLink.trim();
      const urlPattern = /^https?:\/\/[^\s]+$/i;
      if (!urlPattern.test(trimmedLink)) {
        showAlert({
          title: t("error_past_date_title"),
          message: t("error_invalid_online_link"),
          type: 'warning',
        });
        return;
      }
    }

    if (!user) {
      showAlert({
        title: t("error_past_date_title"),
        message: t("error_login_required"),
        type: 'error',
      });
      return;
    }

    if (
      (maxCapacity && maxCapacity.length > 4) ||
      (cost && cost.replace(/\D/g, "").length > 6)
    ) {
      showAlert({
        title: t("error_past_date_title"),
        message: t("error_capacity_price_invalid"),
        type: 'warning',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Upload image if selected
      const uploadedImageUrl = await uploadImageIfNeeded();

      // Build payload used for insert or update
      const eventPayload: any = {
        title,
        organizer_id: user.id,
        max_capacity: maxCapacity ? parseInt(maxCapacity, 10) : null,
        price: cost ? parseFloat(cost) : 0,
        location: eventType === "onsite" ? location : null,
        is_online: eventType === "online",
        link: eventType === "online" ? eventLink : null,
        gender: gender === "Males" ? "male" : gender === "Females" ? "female" : "all",
        date: startDate.toISOString().split("T")[0],
        time: eventTime.toTimeString().split(" ")[0],
        end_time: endTime ? endTime.toTimeString().split(" ")[0] : null,
        end_date: endDate ? endDate.toISOString().split("T")[0] : null,
        image_url:
          uploadedImageUrl ||
          "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?q=80&w=400&h=250&auto=format&fit=crop",
        // Recurrence fields (simple weekly series)
        is_recurring: isRecurringWeekly && !!startDate,
        recurrence_pattern: isRecurringWeekly && startDate ? "weekly" : null,
        recurrence_days:
          isRecurringWeekly && startDate ? [startDate.getDay()] : null,
        recurrence_end_date: endDate
          ? endDate.toISOString().split("T")[0]
          : null,
        parent_event_id: null,
        status: "active",
      };

      // Add description (and simple recurrence note) if description column exists in DB
      let finalDescription = description;
      if (isRecurringWeekly && startDate) {
        const weekdayName = startDate.toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", {
          weekday: "long",
        });
        const note = `\n\n${t("create_event_repeat_note_prefix")} ${weekdayName}s.`;
        finalDescription = (description || "") + note;
      }
      eventPayload.description = finalDescription;

      // Attach geo coords for onsite events if we have them
      if (eventType === "onsite" && selectedLocationCoords) {
        eventPayload.latitude = selectedLocationCoords.latitude;
        eventPayload.longitude = selectedLocationCoords.longitude;
      }

      let eventId: string | null = null;

      if (isEditMode && editId) {
        // Update existing event
        const { data: updatedData, error: updateError } = await supabase
          .from("events")
          .update(eventPayload)
          .eq("id", editId)
          .select()
          .single();

        if (updateError) {
          console.log("Initial Update failed, checking for field compatibility...", updateError.code);

          // Fallback if latitude/longitude columns do not exist
            if (
              updateError.message?.includes("latitude") ||
              updateError.message?.includes("longitude") ||
              updateError.message?.includes("end_date") ||
              updateError.message?.includes("status") ||
              updateError.message?.includes("cancellation_reason")
            ) {
              const payloadWithoutProblemFields = { ...eventPayload };
              delete payloadWithoutProblemFields.latitude;
              delete payloadWithoutProblemFields.longitude;
              delete payloadWithoutProblemFields.end_date;
              delete payloadWithoutProblemFields.status;
              delete payloadWithoutProblemFields.cancellation_reason;
  
              const { data: retryData, error: retryError } = await supabase
              .from("events")
              .update(payloadWithoutProblemFields)
              .eq("id", editId)
              .select()
              .single();

            if (retryError) throw retryError;
            eventId = retryData.id;
          } else {
            throw updateError;
          }
        } else {
          eventId = updatedData.id;
        }

        // Clear existing tags before re-adding
        if (eventId) {
          await supabase.from("event_tags").delete().eq("event_id", eventId);
        }
      } else {
        // Insert new event
        let createdEvent: any = null;
        const { data: initialData, error: initialError } = await supabase
          .from("events")
          .insert(eventPayload)
          .select()
          .single();

        if (initialError) {
          console.log("Initial Insert failed, retrying with compatible fields...", initialError.code);
          // Fallback for missing description or latitude/longitude columns if it fails
          const payloadWithoutProblemFields = { ...eventPayload };

          if (initialError.message?.includes("description")) {
            delete payloadWithoutProblemFields.description;
          }
          if (initialError.message?.includes("end_date")) {
            delete payloadWithoutProblemFields.end_date;
          }
          if (initialError.message?.includes("status")) {
            delete payloadWithoutProblemFields.status;
          }
          if (initialError.message?.includes("cancellation_reason")) {
            delete payloadWithoutProblemFields.cancellation_reason;
          }
          if (
            initialError.message?.includes("latitude") ||
            initialError.message?.includes("longitude")
          ) {
            delete payloadWithoutProblemFields.latitude;
            delete payloadWithoutProblemFields.longitude;
          }

          const { data: retryData, error: retryError } = await supabase
            .from("events")
            .insert(payloadWithoutProblemFields)
            .select()
            .single();

          if (retryError) throw retryError;
          createdEvent = retryData;
        } else {
          createdEvent = initialData;
        }

        eventId = createdEvent?.id || null;
      }

      // 2. Handle Tags
      if (selectedTags.length > 0 && eventId) {
        for (const tagName of selectedTags) {
          let { data: tagData } = await supabase
            .from("tags")
            .select("id")
            .eq("name", tagName)
            .maybeSingle();

          let tagId;
          if (!tagData) {
            const { data: newTag, error: createTagError } = await supabase
              .from("tags")
              .insert({ name: tagName, category: "General" })
              .select()
              .single();
            if (createTagError) {
              if (createTagError.code === "42501") {
                console.log("Tag creation restricted by policy, skipping new tag:", tagName);
              } else {
                console.error("Error creating tag:", createTagError);
              }
            }
            tagId = newTag?.id;
          } else {
            tagId = tagData.id;
          }

          if (tagId) {
            await supabase.from("event_tags").insert({
              event_id: eventId,
              tag_id: tagId,
            });
          }
        }
      }

      setSavedEventId(eventId);
      trackAction(isEditMode ? "edit_event_success" : "create_event_success", { eventId });
      resetForm();
      // Promotion disabled - show success instead
      showAlert({
        title: t("success_title") || "Success",
        message: isEditMode
          ? t("event_updated_success") || "Event updated!"
          : t("event_posted_success") || "Event posted!",
        type: "success",
      });
      notificationManager.setHasUnreadEvents(true);
      router.replace("/(tabs)");
    } catch (error: any) {
      console.error("Publish Error:", error);
      showAlert({
        title: "Error",
        message: error.message || t("error_generic"),
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isOnsite = eventType === "onsite";
  const isOnline = eventType === "online";

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons
            name={language === "ar" ? "chevron-forward" : "chevron-back"}
            size={28}
            color={Colors.white}
          />
        </TouchableOpacity>
        <Text style={styles.logo}>
          {isEditMode ? t("edit_event_title") : t("create_event_title")}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.imagePlaceholder}
            activeOpacity={0.8}
            onPress={handlePickImage}
          >
            {image ? (
              <Image
                source={{ uri: image }}
                style={styles.imagePlaceholderImage}
                contentFit="cover"
              />
            ) : (
              <>
                <Ionicons name="add" size={50} color={Colors.primary} />
                <Text style={styles.imagePlaceholderText}>
                  {t("create_event_banner_hint")}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder={t("create_event_title_placeholder")}
                placeholderTextColor={Colors.gray}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={t("create_event_description_placeholder")}
                placeholderTextColor={Colors.gray}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <Text style={styles.label}>{t("create_event_type_label")}</Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeButton, isOnline && styles.typeButtonActive]}
                onPress={() => setEventType("online")}
              >
                <Ionicons
                  name="globe-outline"
                  size={20}
                  color={isOnline ? Colors.white : Colors.gray}
                />
                <Text
                  style={[
                    styles.typeButtonText,
                    isOnline && styles.typeButtonTextActive,
                  ]}
                >
                  {t("create_event_online")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, isOnsite && styles.typeButtonActive]}
                onPress={() => setEventType("onsite")}
              >
                <Ionicons
                  name="location-outline"
                  size={20}
                  color={isOnsite ? Colors.white : Colors.gray}
                />
                <Text
                  style={[
                    styles.typeButtonText,
                    isOnsite && styles.typeButtonTextActive,
                  ]}
                >
                  {t("create_event_onsite")}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder={
                  isOnline
                    ? t("create_event_location_online")
                    : t("create_event_location_onsite")
                }
                placeholderTextColor={Colors.gray}
                value={isOnline ? eventLink : location}
                onChangeText={handleLocationChange}
                editable={!!eventType}
              />
            </View>

            {/* Mapbox search suggestions for onsite events */}
            {isOnsite && showLocationSuggestions && (
              <ScrollView
                style={styles.locationSuggestionsContainer}
                scrollEnabled={locationSuggestions.length > 5}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
              >
                {locationSuggestions.map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion.id}
                    style={styles.suggestionItem}
                    onPress={() => handleSelectLocationSuggestion(suggestion)}
                  >
                    <Text style={styles.suggestionText}>
                      {suggestion.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <Text style={styles.label}>{t("create_event_schedule_label")}</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.inputContainer, { flex: 1 }]}
                onPress={() => setDatePickerVisibility(true)}
              >
                <View style={styles.pickerTrigger}>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={Colors.primary}
                  />
                  <Text
                    style={[styles.input, { marginLeft: 10, lineHeight: 55 }]}
                  >
                    {startDate
                      ? startDate.toLocaleDateString()
                      : t("create_event_start_date")}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.inputContainer, { flex: 1 }]}
                onPress={() => setTimePickerVisibility(true)}
              >
                <View style={styles.pickerTrigger}>
                  <Ionicons
                    name="time-outline"
                    size={20}
                    color={Colors.primary}
                  />
                  <Text
                    style={[styles.input, { marginLeft: 10, lineHeight: 55 }]}
                  >
                    {eventTime
                      ? eventTime.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : t("create_event_time")}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>{t("create_event_end_label")}</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.inputContainer, { flex: 1 }]}
                onPress={() => setEndDatePickerVisibility(true)}
              >
                <View style={styles.pickerTrigger}>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={Colors.primary}
                  />
                  <Text
                    style={[styles.input, { marginLeft: 10, lineHeight: 55 }]}
                  >
                    {endDate
                      ? endDate.toLocaleDateString()
                      : t("create_event_end_date")}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.inputContainer, { flex: 1 }]}
                onPress={() => setEndTimePickerVisibility(true)}
              >
                <View style={styles.pickerTrigger}>
                  <Ionicons
                    name="time-outline"
                    size={20}
                    color={Colors.primary}
                  />
                  <Text
                    style={[styles.input, { marginLeft: 10, lineHeight: 55 }]}
                  >
                    {endTime
                      ? endTime.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : t("create_event_end_time")}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Simple weekly recurrence toggle */}
            <View style={[styles.row, { alignItems: "center", marginTop: 8 }]}>
              <TouchableOpacity
                style={[
                  styles.recurringToggle,
                  isRecurringWeekly && styles.recurringToggleActive,
                ]}
                onPress={() => setIsRecurringWeekly((prev) => !prev)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isRecurringWeekly ? "checkmark" : "repeat-outline"}
                  size={18}
                  color={isRecurringWeekly ? Colors.white : Colors.gray}
                />
              </TouchableOpacity>
              <Text style={styles.recurringLabel}>{t("create_event_repeat_weekly")}</Text>
            </View>

            {startDate && (
              <Text style={styles.recurringHelper}>
                {isRecurringWeekly
                  ? `${t("create_event_repeat_helper_prefix")} ${startDate.toLocaleDateString(
                      language === "ar" ? "ar-EG" : "en-US",
                      { weekday: "long" },
                    )}s${
                      endDate
                        ? ` ${t("create_event_repeat_helper_until")} ${endDate.toLocaleDateString()}`
                        : ` ${t("create_event_repeat_helper_no_end")}`
                    }.`
                  : startDate.toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
              </Text>
            )}

            <View style={styles.row}>
              <View style={[styles.inputContainer, { flex: 1 }]}>
                <TextInput
                  style={styles.input}
                  placeholder={t("create_event_capacity")}
                  placeholderTextColor={Colors.gray}
                  value={maxCapacity}
                  onChangeText={(text) =>
                    setMaxCapacity(text.replace(/[^0-9]/g, ""))
                  }
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.inputContainer, { flex: 1 }]}>
                <TextInput
                  style={styles.input}
                  placeholder={t("create_event_cost")}
                  placeholderTextColor={Colors.gray}
                  value={cost}
                  onChangeText={(text) =>
                    setCost(text.replace(/[^0-9.]/g, ""))
                  }
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <Text style={styles.label}>{t("create_event_gender_label")}</Text>
            <View style={styles.genderSelector}>
              {["All", "Males", "Females"].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.genderOption,
                    gender === option && styles.genderOptionActive,
                  ]}
                  onPress={() => setGender(option)}
                >
                  {option !== "All" && (
                    <Ionicons
                      name={option === "Males" ? "male" : "female"}
                      size={16}
                      color={gender === option ? Colors.white : Colors.primary}
                    />
                  )}
                  <Text
                    style={[
                      styles.genderOptionText,
                      gender === option && styles.genderOptionTextActive,
                    ]}
                  >
                    {t(
                      `create_event_gender_${option.toLowerCase()}` as any,
                    )}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Tags Input */}
            <Text style={styles.label}>{t("create_event_tags_label")}</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder={t("create_event_tags_placeholder")}
                placeholderTextColor={Colors.gray}
                value={tagInput}
                onChangeText={handleTagInputChange}
                onSubmitEditing={addCustomTag}
                returnKeyType="done"
              />
            </View>

            {showTagSuggestions && (
              <ScrollView
                style={styles.suggestionsContainer}
                scrollEnabled={suggestedTags.length > 5}
                nestedScrollEnabled={true}
              >
                {suggestedTags.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={styles.suggestionItem}
                    onPress={() => addTag(tag)}
                  >
                    <Text style={styles.suggestionText}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {selectedTags.length > 0 && (
              <View style={styles.selectedTagsContainer}>
                {selectedTags.map((tagName) => {
                  const tObj = tagObjects.find(t => t.name === tagName);
                  const displayLabel = tObj ? tObj.label : tagName;
                  return (
                    <TouchableOpacity
                      key={tagName}
                      style={styles.selectedTag}
                      onPress={() => removeTag(tagName)}
                    >
                      <Text style={styles.selectedTagText}>{displayLabel}</Text>
                      <Ionicons name="close" size={16} color={Colors.white} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {PROMOTIONS_ENABLED && !isEditMode && (
              <PromotedButton
                title={t("create_event_promote")}
                onPress={() => setShowPromotionSheet(true)}
              />
            )}

            <Button
              title={
                isLoading
                  ? isEditMode
                    ? t("create_event_saving")
                    : t("create_event_publishing")
                  : isEditMode
                    ? t("create_event_save_changes")
                    : t("create_event_publish")
              }
              onPress={handlePublish}
              style={styles.publishButton}
              disabled={isLoading}
            />

            {isEditMode && (
              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={24} color={Colors.error} />
                <Text style={styles.deleteButtonText}>{t("create_event_delete")}</Text>
              </TouchableOpacity>
            )}

            {isLoading && (
              <ActivityIndicator
                size="small"
                color={Colors.primary}
                style={{ marginTop: 10 }}
              />
            )}

            {/* Modals for Pickers */}
            <DateTimePickerModal
              isVisible={isDatePickerVisible}
              mode="date"
              onConfirm={handleConfirmDate}
              onCancel={() => setDatePickerVisibility(false)}
              textColor={Colors.black}
            />
            <DateTimePickerModal
              isVisible={isEndDatePickerVisible}
              mode="date"
              onConfirm={handleConfirmEndDate}
              onCancel={() => setEndDatePickerVisibility(false)}
              textColor={Colors.black}
            />
            <DateTimePickerModal
              isVisible={isTimePickerVisible}
              mode="time"
              onConfirm={handleConfirmTime}
              onCancel={() => setTimePickerVisibility(false)}
              textColor={Colors.black}
            />
            <DateTimePickerModal
              isVisible={isEndTimePickerVisible}
              mode="time"
              onConfirm={handleConfirmEndTime}
              onCancel={() => setEndTimePickerVisibility(false)}
              textColor={Colors.black}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {PROMOTIONS_ENABLED && (
        <PromoteEventModal
          visible={showPromoteModal}
          onClose={() => {
            setShowPromoteModal(false);
            notificationManager.setHasUnreadEvents(true);
            if (isEditMode && savedEventId) {
              router.replace({
                pathname: "/event-details",
                params: { id: savedEventId },
              });
            } else {
              resetForm();
              router.replace("/(tabs)");
            }
          }}
          onBoost={() => {
            setShowPromoteModal(false);
            // Handle boost logic
          }}
          onChooseBudget={() => {
            setShowPromoteModal(false);
            setShowPromotionSheet(true);
          }}
        />
      )}

      {PROMOTIONS_ENABLED && (
        <PromotionBottomSheet
          visible={showPromotionSheet}
          onClose={() => setShowPromotionSheet(false)}
          onContinue={(price, fillAllSeats) => {
            console.log(`Continuing with price: ${price}, fillAllSeats: ${fillAllSeats}`);
            // Proceed to purchase logic here
            setShowPromotionSheet(false);
            notificationManager.setHasUnreadEvents(true);
            if (isEditMode && savedEventId) {
              router.replace({
                pathname: "/event-details",
                params: { id: savedEventId },
              });
            } else {
              resetForm();
              router.replace("/(tabs)");
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  logo: { color: Colors.white, fontSize: 24, fontFamily: Fonts.bold },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  imagePlaceholder: {
    height: 180,
    backgroundColor: Colors.darkflame,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  imagePlaceholderImage: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  imagePlaceholderText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: "500",
    marginTop: 10,
  },
  form: { gap: 15 },
  label: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: Fonts.semibold,
    marginTop: 10,
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: Colors.lightblack,
    borderRadius: 12,
    backgroundColor: "transparent",
    paddingHorizontal: 15,
  },
  input: {
    height: 55,
    color: Colors.white,
    fontSize: 16,
    fontFamily: Fonts.regular,
  },
  textAreaContainer: { height: 100 },
  textArea: { height: "100%", paddingTop: 15 },
  typeSelector: { flexDirection: "row", gap: 12 },
  genderSelector: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  genderOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.lightblack,
    backgroundColor: Colors.black,
  },
  genderOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  genderOptionText: {
    color: Colors.gray,
    fontSize: 14,
    fontFamily: Fonts.semibold,
  },
  genderOptionTextActive: { color: Colors.white },
  typeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.lightblack,
  },
  typeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeButtonText: {
    color: Colors.gray,
    fontSize: 16,
    fontFamily: Fonts.semibold,
  },
  typeButtonTextActive: { color: Colors.white },
  row: { flexDirection: "row", gap: 10 },
  pickerTrigger: { flexDirection: "row", alignItems: "center" },
  suggestionsContainer: {
    backgroundColor: Colors.lightblack,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray,
    marginTop: -10,
    maxHeight: 250,
  },
  locationSuggestionsContainer: {
    backgroundColor: Colors.lightblack,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray,
    marginTop: -10,
    marginBottom: 10,
    maxHeight: 250,
  },
  suggestionItem: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray,
  },
  suggestionText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: Fonts.regular,
  },
  selectedTagsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  selectedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  selectedTagText: {
    color: Colors.white,
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  publishButton: { marginTop: 10 },
  recurringToggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.lightblack,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  recurringToggleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  recurringLabel: {
    color: Colors.white,
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  recurringHelper: {
    color: Colors.gray,
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 6,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.errorTransparent, // Light red background
    borderWidth: 1,
    borderColor: Colors.errorTransparentBorder,
    marginTop: 15,
  },
  deleteButtonText: {
    color: Colors.error,
    fontSize: 16,
    fontFamily: Fonts.bold,
    marginLeft: 8,
  },
});
