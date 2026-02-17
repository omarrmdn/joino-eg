import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
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
import {
    notifyEventCancellation,
    notifyEventLinkUpdate
} from "../../notification/eventNotifications";
import notificationService from "../../notification/notificationService";
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
import {
    autoDetectAndUpdateUserCurrency,
    getCountryCodeFromLocale,
    getCurrencyInfo,
} from "../../src/utils/currency";

type EventType = "online" | "onsite" | "";

type MapboxPlaceSuggestion = {
  id: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  countryCode: string | null;
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
  const { showAlert, showToast } = useAlert();
  const { trackAction } = useTrackSession();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<EventType>("");
  const [location, setLocation] = useState("");
  const [eventLink, setEventLink] = useState("");
  const [originalEventLink, setOriginalEventLink] = useState("");
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
  const [isFetchingCurrentLocation, setIsFetchingCurrentLocation] = useState(false);
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

  const [userCurrencyCode, setUserCurrencyCode] = useState<string | null>(null);
  const [userCurrencySymbol, setUserCurrencySymbol] = useState<string>("$");
  const [userCountryCode, setUserCountryCode] = useState<string | null>(null);

  // Per-field validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const hasLocationApiKey = !!process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

  useEffect(() => {
    let active = true;
    const loadUserCurrency = async () => {
      if (!user?.id) return;
      let code: string | null = null;
      let country: string | null = null;
      try {
        const { data } = await supabase
          .from("users")
          .select("currency_code, country_code")
          .eq("id", user.id)
          .maybeSingle();
        code = data?.currency_code || null;
        country = data?.country_code || null;
      } catch {
        code = null;
        country = null;
      }

      if (!code) {
        const localeCountry = getCountryCodeFromLocale();
        const detected = await autoDetectAndUpdateUserCurrency(
          supabase,
          user.id,
          localeCountry,
        );
        code = detected || code;
        if (localeCountry) country = localeCountry;
      }

      if (!active) return;
      setUserCurrencyCode(code);
      setUserCountryCode(country);
      if (code) {
        const info = await getCurrencyInfo(supabase, code);
        if (active && info?.symbol) {
          setUserCurrencySymbol(info.symbol);
        }
      }
    };
    loadUserCurrency();
    return () => {
      active = false;
    };
  }, [user?.id, supabase]);

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
          return;
        }

      try {
        let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query,
        )}.json?access_token=${apiKey}&autocomplete=true&limit=5`;
        
        if (userCountryCode) {
            url += `&country=${userCountryCode}`;
        }
        
        const response = await fetch(url);
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
            countryCode:
              f?.context?.find?.((c: any) => String(c?.id || "").startsWith("country"))?.short_code ||
              f?.properties?.short_code ||
              null,
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
    [userCountryCode],
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

      if (user?.id && suggestion.countryCode) {
        const detected = await autoDetectAndUpdateUserCurrency(
          supabase,
          user.id,
          suggestion.countryCode,
        );
        if (detected) {
          setUserCurrencyCode(detected);
          const info = await getCurrencyInfo(supabase, detected);
          if (info?.symbol) {
            setUserCurrencySymbol(info.symbol);
          }
        }
      }
    },
    [supabase, user?.id],
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

  const handleUseCurrentLocation = useCallback(async () => {
    if (isFetchingCurrentLocation) return;

    trackAction("location_use_current_for_event");
    setIsFetchingCurrentLocation(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showAlert({
          title: t("location_settings_title") || "Permission Required",
          message: t("location_settings_msg"),
          type: "warning",
        });
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const [address] = await Location.reverseGeocodeAsync({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });

      const parts = [
        address?.name,
        address?.city,
        address?.region,
        address?.country,
      ].filter(Boolean);

      const formattedLocation =
        parts.join(", ") ||
        `${current.coords.latitude.toFixed(4)}, ${current.coords.longitude.toFixed(4)}`;

      setLocation(formattedLocation);
      setSelectedLocationCoords({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);

      if (user?.id) {
        const detected = await autoDetectAndUpdateUserCurrency(
          supabase,
          user.id,
          address?.isoCountryCode || null,
        );
        if (detected) {
          setUserCurrencyCode(detected);
          const info = await getCurrencyInfo(supabase, detected);
          if (info?.symbol) {
            setUserCurrencySymbol(info.symbol);
          }
        }
      }
    } catch (error) {
      console.warn("Error getting current location:", error);
      showAlert({
        title: t("error_title"),
        message: t("location_error_msg"),
        type: "error",
      });
    } finally {
      setIsFetchingCurrentLocation(false);
    }
  }, [isFetchingCurrentLocation, showAlert, t, trackAction, supabase, user?.id]);

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
        setOriginalEventLink(data.link || "");
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
      // Clear editId from params to exit edit mode if we were in it
      router.setParams({ editId: undefined });
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
                // 1. Notify attendees before deletion (requires event details)
                const { data: eventData } = await supabase
                  .from("events")
                  .select("title")
                  .eq("id", editId)
                  .single();
                  
                if (eventData) {
                   await notifyEventCancellation(
                      supabase,
                      editId,
                      t("event_cancellation_reason_organizer_deleted") || "Organizer deleted the event"
                   );
                }

                // 2. Delete the event
                const { error } = await supabase
                  .from("events")
                  .delete()
                  .eq("id", editId);
  
                if (error) throw error;
                trackAction("delete_event", { eventId: editId });
                notificationManager.setHasUnreadEvents(true);
                
                resetForm(); // This will also clear editId param
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


    // Validate all required fields and return errors object
    const validateForm = (): Record<string, string> => {
      const errors: Record<string, string> = {};

      if (!image) errors.image = t("error_required_fields");
      if (!title.trim()) errors.title = t("error_required_fields");
      if (!eventType) errors.eventType = t("error_required_fields");

      if (eventType === "onsite" && !location.trim()) {
        errors.location = t("error_location_required_onsite");
      }
      if (eventType === "onsite" && location.trim() && hasLocationApiKey && !selectedLocationCoords) {
        errors.location = t("error_location_google_required");
      }
      if (eventType === "online" && !eventLink.trim()) {
        errors.link = t("error_link_required_online");
      }
      if (eventType === "online" && eventLink.trim()) {
        const urlPattern = /^https?:\/\/[^\s]+$/i;
        if (!urlPattern.test(eventLink.trim())) {
          errors.link = t("error_invalid_online_link");
        }
      }

      if (!startDate) errors.startDate = t("error_required_fields");
      if (!eventTime) errors.eventTime = t("error_required_fields");
      if (!endTime) errors.endTime = t("error_required_fields");

      if (!maxCapacity.trim()) {
        errors.capacity = t("error_required_fields");
      } else if (maxCapacity.length > 4) {
        errors.capacity = t("error_capacity_price_invalid");
      }

      if (!cost.trim()) {
        errors.cost = t("error_required_fields");
      } else if (cost.replace(/\D/g, "").length > 6) {
        errors.cost = t("error_capacity_price_invalid");
      }

      if (selectedTags.length === 0) {
        errors.tags = t("error_required_fields");
      }

      return errors;
    };

    const handlePublish = async () => {
    // Validate all fields
    const errors = validateForm();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      showAlert({
        title: t("error_title"),
        message: t("error_required_fields"),
        type: 'warning',
      });
      return;
    }

    if (!user) {
      showAlert({
        title: t("error_past_date_title"),
        message: t("error_login_required"),
        type: 'error',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Upload image if selected
      const uploadedImageUrl = await uploadImageIfNeeded();

      // Build payload used for insert or update
      let resolvedCurrencyCode = userCurrencyCode;
      if (!resolvedCurrencyCode && user?.id) {
        const detected = await autoDetectAndUpdateUserCurrency(
          supabase,
          user.id,
          getCountryCodeFromLocale(),
        );
        if (detected) {
          resolvedCurrencyCode = detected;
          setUserCurrencyCode(detected);
          const info = await getCurrencyInfo(supabase, detected);
          if (info?.symbol) {
            setUserCurrencySymbol(info.symbol);
          }
        }
      }

      const eventPayload: any = {
        title,
        organizer_id: user.id,
        max_capacity: maxCapacity ? parseInt(maxCapacity, 10) : null,
        price: cost ? parseFloat(cost) : 0,
        location: eventType === "onsite" ? location : null,
        is_online: eventType === "online",
        link: eventType === "online" ? eventLink : null,
        gender: gender === "Males" ? "male" : gender === "Females" ? "female" : "all",
        date: startDate!.toISOString().split("T")[0],
        time: eventTime!.toTimeString().split(" ")[0],
        end_time: endTime ? endTime.toTimeString().split(" ")[0] : null,
        end_date: endDate ? endDate.toISOString().split("T")[0] : null,
        image_url: uploadedImageUrl,
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

      if (resolvedCurrencyCode) {
        eventPayload.currency_code = resolvedCurrencyCode;
      }

      // Add description (and simple recurrence note) if description column exists in DB
      let finalDescription = description;
      if (isRecurringWeekly && startDate) {
        const weekdayName = startDate.toLocaleDateString(language.startsWith("ar") ? "ar-EG" : "en-US", {
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

      // If online and link changed during edit, notify attendees
      if (isEditMode && eventId && isOnline && eventLink && eventLink !== originalEventLink) {
        console.log("Link changed, notifying attendees...");
        await notifyEventLinkUpdate(supabase, eventId, eventLink);
      }

      resetForm();
        // Promotion disabled - show success instead
        showToast({
          message: isEditMode
            ? t("event_updated_success")
            : t("event_posted_success"),
          type: "success",
        });
      notificationManager.setHasUnreadEvents(true);

      // Trigger local notification and persist it
      if (!isEditMode) {
        const notifTitle = t("notification_event_posted_title");
        const notifBody = t("notification_event_posted_body").replace("{title}", title);
        
        await notificationService.sendLocalNotification(notifTitle, notifBody, {
          event_id: eventId || undefined,
        });

        // Persist in DB
        await supabase.from("notifications").insert({
          user_id: user.id,
          type: 'new_event',
          title: notifTitle,
          body: notifBody,
          data: { event_id: eventId },
          read: false
        });
      }

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
            name={language.startsWith("ar") ? "chevron-forward" : "chevron-back"}
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
            style={[styles.imagePlaceholder, fieldErrors.image && styles.inputError]}
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
                <Ionicons name="add" size={50} color={fieldErrors.image ? Colors.error : Colors.primary} />
                <Text style={[styles.imagePlaceholderText, fieldErrors.image && { color: Colors.error }]}>
                  {t("create_event_banner_hint")}
                </Text>
              </>
            )}
          </TouchableOpacity>
          {fieldErrors.image && <Text style={styles.fieldErrorText}>{fieldErrors.image}</Text>}
          <Text style={styles.imageSizeHint}>{t("create_event_image_size_hint")}</Text>

          <View style={styles.form}>
            <View style={[styles.inputContainer, fieldErrors.title && styles.inputError]}>
              <TextInput
                style={styles.input}
                placeholder={t("create_event_title_placeholder")}
                placeholderTextColor={fieldErrors.title ? Colors.error : Colors.gray}
                value={title}
                onChangeText={(text) => { setTitle(text); if (fieldErrors.title) setFieldErrors(prev => { const n = {...prev}; delete n.title; return n; }); }}
              />
            </View>
            {fieldErrors.title && <Text style={styles.fieldErrorText}>{fieldErrors.title}</Text>}

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
            <Text style={styles.tipNote}>
              {(t("create_event_description_tip" as any) || "Tip: You can write more details about the event or a detailed location here.")}
            </Text>

            <Text style={styles.label}>{t("create_event_type_label")}</Text>
            <View style={[styles.typeSelector, fieldErrors.eventType && { borderWidth: 1, borderColor: Colors.error, borderRadius: 12, padding: 4 }]}>
              <TouchableOpacity
                style={[styles.typeButton, isOnline && styles.typeButtonActive, fieldErrors.eventType && !isOnline && styles.typeButtonError]}
                onPress={() => { setEventType("online"); if (fieldErrors.eventType) setFieldErrors(prev => { const n = {...prev}; delete n.eventType; return n; }); }}
              >
                <Ionicons
                  name="globe-outline"
                  size={20}
                  color={isOnline ? Colors.white : fieldErrors.eventType ? Colors.error : Colors.gray}
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
                style={[styles.typeButton, isOnsite && styles.typeButtonActive, fieldErrors.eventType && !isOnsite && styles.typeButtonError]}
                onPress={() => { setEventType("onsite"); if (fieldErrors.eventType) setFieldErrors(prev => { const n = {...prev}; delete n.eventType; return n; }); }}
              >
                <Ionicons
                  name="location-outline"
                  size={20}
                  color={isOnsite ? Colors.white : fieldErrors.eventType ? Colors.error : Colors.gray}
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
            {fieldErrors.eventType && <Text style={styles.fieldErrorText}>{fieldErrors.eventType}</Text>}

            <View style={[styles.inputContainer, (fieldErrors.location || fieldErrors.link) && styles.inputError]}>
              <View style={styles.locationInputRow}>
                <TextInput
                  style={[styles.input, styles.locationInput]}
                  placeholder={
                    isOnline
                      ? t("create_event_location_online")
                      : t("create_event_location_onsite")
                  }
                  placeholderTextColor={(fieldErrors.location || fieldErrors.link) ? Colors.error : Colors.gray}
                  value={isOnline ? eventLink : location}
                  onChangeText={(text) => {
                    handleLocationChange(text);
                    if (fieldErrors.location || fieldErrors.link) setFieldErrors(prev => { const n = {...prev}; delete n.location; delete n.link; return n; });
                  }}
                  editable={!!eventType}
                />
                {isOnsite && (
                  <TouchableOpacity
                    style={styles.locationIndicatorButton}
                    onPress={handleUseCurrentLocation}
                    disabled={isFetchingCurrentLocation}
                  >
                    {isFetchingCurrentLocation ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                      <Ionicons
                        name="location-outline"
                        size={18}
                        color={Colors.white}
                      />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
            {(fieldErrors.location || fieldErrors.link) && <Text style={styles.fieldErrorText}>{fieldErrors.location || fieldErrors.link}</Text>}

            {/* Mapbox search suggestions for onsite events */}
            {isOnsite && showLocationSuggestions && (
              <ScrollView
                style={styles.locationSuggestionsContainer}
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
                style={[styles.inputContainer, { flex: 1 }, fieldErrors.startDate && styles.inputError]}
                onPress={() => { setDatePickerVisibility(true); if (fieldErrors.startDate) setFieldErrors(prev => { const n = {...prev}; delete n.startDate; return n; }); }}
              >
                <View style={styles.pickerTrigger}>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={fieldErrors.startDate ? Colors.error : Colors.primary}
                  />
                  <Text
                    style={[styles.input, { marginLeft: 10, lineHeight: 55 }, fieldErrors.startDate && { color: Colors.error }]}
                  >
                    {startDate
                      ? startDate.toLocaleDateString()
                      : t("create_event_start_date")}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.inputContainer, { flex: 1 }, fieldErrors.eventTime && styles.inputError]}
                onPress={() => { setTimePickerVisibility(true); if (fieldErrors.eventTime) setFieldErrors(prev => { const n = {...prev}; delete n.eventTime; return n; }); }}
              >
                <View style={styles.pickerTrigger}>
                  <Ionicons
                    name="time-outline"
                    size={20}
                    color={fieldErrors.eventTime ? Colors.error : Colors.primary}
                  />
                  <Text
                    style={[styles.input, { marginLeft: 10, lineHeight: 55 }, fieldErrors.eventTime && { color: Colors.error }]}
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
            {(fieldErrors.startDate || fieldErrors.eventTime) && <Text style={styles.fieldErrorText}>{fieldErrors.startDate || fieldErrors.eventTime}</Text>}

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
                style={[styles.inputContainer, { flex: 1 }, fieldErrors.endTime && styles.inputError]}
                onPress={() => { setEndTimePickerVisibility(true); if (fieldErrors.endTime) setFieldErrors(prev => { const n = {...prev}; delete n.endTime; return n; }); }}
              >
                <View style={styles.pickerTrigger}>
                  <Ionicons
                    name="time-outline"
                    size={20}
                    color={fieldErrors.endTime ? Colors.error : Colors.primary}
                  />
                  <Text
                    style={[styles.input, { marginLeft: 10, lineHeight: 55 }, fieldErrors.endTime && { color: Colors.error }]}
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
                      language.startsWith("ar") ? "ar-EG" : "en-US",
                      { weekday: "long" },
                    )}${language === 'en' ? 's' : ''}${
                      endDate
                        ? ` ${t("create_event_repeat_helper_until")} ${endDate.toLocaleDateString()}`
                        : ` ${t("create_event_repeat_helper_no_end")}`
                    }.`
                  : startDate.toLocaleDateString(language.startsWith("ar") ? "ar-EG" : "en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
              </Text>
            )}

            <View style={styles.row}>
              <View style={[{ flex: 1 }]}>
                <View style={[styles.inputContainer, fieldErrors.capacity && styles.inputError]}>
                  <TextInput
                    style={styles.input}
                    placeholder={t("create_event_capacity")}
                    placeholderTextColor={fieldErrors.capacity ? Colors.error : Colors.gray}
                    value={maxCapacity}
                    onChangeText={(text) => {
                      setMaxCapacity(text.replace(/[^0-9]/g, ""));
                      if (fieldErrors.capacity) setFieldErrors(prev => { const n = {...prev}; delete n.capacity; return n; });
                    }}
                    keyboardType="number-pad"
                  />
                </View>
                {fieldErrors.capacity && <Text style={styles.fieldErrorText}>{fieldErrors.capacity}</Text>}
              </View>
              <View style={[{ flex: 1 }]}>
                <View style={[styles.inputContainer, fieldErrors.cost && styles.inputError]}>
                  <TextInput
                    style={styles.input}
                    placeholder={t("create_event_cost")}
                    placeholderTextColor={fieldErrors.cost ? Colors.error : Colors.gray}
                    value={cost}
                    onChangeText={(text) => {
                      setCost(text.replace(/[^0-9.]/g, ""));
                      if (fieldErrors.cost) setFieldErrors(prev => { const n = {...prev}; delete n.cost; return n; });
                    }}
                    keyboardType="decimal-pad"
                  />
                </View>
                {fieldErrors.cost && <Text style={styles.fieldErrorText}>{fieldErrors.cost}</Text>}
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
            <View style={[styles.inputContainer, fieldErrors.tags && styles.inputError]}>
              <TextInput
                style={styles.input}
                placeholder={t("create_event_tags_placeholder")}
                placeholderTextColor={fieldErrors.tags ? Colors.error : Colors.gray}
                value={tagInput}
                onChangeText={handleTagInputChange}
                onSubmitEditing={addCustomTag}
                returnKeyType="done"
              />
            </View>
            {fieldErrors.tags && <Text style={styles.fieldErrorText}>{fieldErrors.tags}</Text>}

            {showTagSuggestions && (
              <ScrollView
                style={styles.suggestionsContainer}
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
          currencySymbol={userCurrencySymbol}
          onContinue={(price, fillAllSeats) => {
            console.log(`Continuing with price: ${price}, fillAllSeats: ${fillAllSeats}`);
            // Proceed to purchase logic here
            setShowPromotionSheet(false);
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
  imageSizeHint: {
    color: Colors.gray,
    fontSize: 12,
    fontFamily: Fonts.regular,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 12,
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
  locationInputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationInput: {
    flex: 1,
    paddingRight: 10,
  },
  locationIndicatorButton: {
    backgroundColor: Colors.darkflame,
    width: 35,
    height: 35,
    borderRadius: 17.5,
    justifyContent: "center",
    alignItems: "center",
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
  inputError: {
    borderColor: Colors.error,
    borderWidth: 1.5,
  },
  typeButtonError: {
    borderColor: Colors.error,
  },
  fieldErrorText: {
    color: Colors.error,
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 2,
    marginBottom: 2,
    marginLeft: 4,
  },
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
  tipNote: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: Fonts.regular,
    fontStyle: 'italic',
    marginTop: 4,
    marginLeft: 4,
  },
});
