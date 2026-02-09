import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { EventQuestion } from "../notification/notifications";
import { Button } from "../src/components/Button";
import { RatingBottomSheet } from "../src/components/RatingBottomSheet";
import { TagPill } from "../src/components/TagPill";
import { Colors } from "../src/constants/Colors";
import { Fonts } from "../src/constants/Fonts";
import { useEvent } from "../src/hooks/useEvents";
import { useAlert } from "../src/lib/AlertContext";
import { TranslationKey, useLanguage } from "../src/lib/i18n";
import { notificationManager } from "../src/lib/NotificationManager";
import { useSupabaseClient } from "../src/lib/supabaseConfig";
import { shareEvent } from "../src/utils/shareEvent";
import { getRecurringLabel } from "../src/utils/recurrence";

import {
    notifyAttendeeCancellation,
    notifyAttendeeEventAccessDetails,
    notifyEventCancellation,
    notifyNewAttendee,
    notifyNewQuestion,
    notifyQuestionAnswer
} from "../notification/eventNotifications";
import { useTrackSession } from "../src/hooks/useTrackSession";

export default function EventDetailsScreen() {
  const { user } = useUser();
  const { trackAction } = useTrackSession();
  const supabase = useSupabaseClient();
  const router = useRouter();
  const scrollRef = React.useRef<ScrollView>(null);
  const { id, autoCancel } = useLocalSearchParams();
  const { event: eventData, loading, error } = useEvent(id as string);
  const [isJoining, setIsJoining] = React.useState(false);
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [isAttending, setIsAttending] = React.useState(false);
  const [attendanceLoading, setAttendanceLoading] = React.useState(true);
  const [questions, setQuestions] = React.useState<EventQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = React.useState(false);
  const [newQuestion, setNewQuestion] = React.useState("");
  const [submittingQuestion, setSubmittingQuestion] = React.useState(false);
  const [showCancelModal, setShowCancelModal] = React.useState(false);
  const [cancelType, setCancelType] = React.useState<"event" | "attendance">("event");
  const [cancellationReason, setCancellationReason] = React.useState("");
  const [isCancellingEvent, setIsCancellingEvent] = React.useState(false);
  const [showRatingSheet, setShowRatingSheet] = React.useState(false);
  const [ratingDismissed, setRatingDismissed] = React.useState(false);
  const [ratingSubmitting, setRatingSubmitting] = React.useState(false);
  const { t, language } = useLanguage();
  const { showAlert } = useAlert();
  const isRTL = language === "ar";
  const recurringLabel = React.useMemo(
    () =>
      eventData
        ? getRecurringLabel(
            eventData.isRecurring,
            eventData.recurrencePattern,
            eventData.recurrenceDays,
            language,
          )
        : null,
    [eventData, language],
  );
  const dateLabel = recurringLabel || eventData?.day || "";

  const answeredQuestions = React.useMemo(
    () => questions.filter((q) => q.answer && q.answer.trim().length > 0),
    [questions],
  );

  const canAskQuestion = eventData?.status !== "canceled";

  const isEnded = React.useMemo(() => {
    if (!eventData) return false;
    if (eventData.status === 'ended') return true;
    const eventDate = new Date(eventData.rawDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate < now;
  }, [eventData]);

  // Load whether current user is already attending
  React.useEffect(() => {
    async function loadAttendance() {
      if (!user || !eventData) {
        setAttendanceLoading(false);
        return;
      }
      try {
        const { data, error: attendanceError } = await supabase
          .from("attendees")
          .select("user_id")
          .eq("event_id", eventData.id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (attendanceError && attendanceError.code !== "PGRST116") {
          console.error("Error checking attendance:", attendanceError);
        }

        setIsAttending(!!data);
      } catch (attendanceErr) {
        console.error("Error checking attendance:", attendanceErr);
      } finally {
        setAttendanceLoading(false);
      }
    }

    loadAttendance();
  }, [supabase, user, eventData]);

  // Load event questions
  React.useEffect(() => {
    async function loadQuestions() {
      if (!eventData) {
        setQuestionsLoading(false);
        return;
      }
      setQuestionsLoading(true);
      try {
        const { data, error: questionsError } = await supabase
          .from("event_questions")
          .select("*")
          .eq("event_id", eventData.id)
          .order("created_at", { ascending: false });

        if (questionsError) {
          console.error("Error loading questions:", questionsError);
        } else if (data) {
          setQuestions(data as EventQuestion[]);
        }
      } catch (qErr) {
        console.error("Error loading questions:", qErr);
      } finally {
        setQuestionsLoading(false);
      }
    }

    loadQuestions();
  }, [supabase, eventData]);

  // Track event view
  React.useEffect(() => {
    if (!eventData) return;

    const trackView = async () => {
      try {
        await supabase.from("event_views").insert({
          event_id: eventData.id,
          user_id: user?.id || null,
          viewed_at: new Date().toISOString(),
        });
        trackAction("view_event_details", { eventId: eventData.id, title: eventData.title });
      } catch (err) {
        console.error("Error tracking event view:", err);
      }
    };

    trackView();
  }, [eventData, user?.id, supabase]);

  const handleJoin = React.useCallback(async () => {
    if (!user || !eventData) {
      showAlert({
        title: "Error",
        message: "You must be logged in to join events",
        type: 'error',
      });
      return;
    }

    if (isAttending) {
      showAlert({
        title: "Info",
        message: "You are already attending this event.",
        type: 'info',
      });
      return;
    }

    if (eventData.status === 'canceled') {
      showAlert({
        title: t("error_title"),
        message: t("error_event_canceled"),
        type: 'error',
      });
      return;
    }

    if (isEnded) {
      showAlert({
        title: t("error_title"),
        message: t("error_event_ended"),
        type: 'error',
      });
      return;
    }

    setIsJoining(true);
    trackAction("initiate_join", { eventId: eventData.id, title: eventData.title });

    try {
      const { error: joinError } = await supabase.from("attendees").insert({
        event_id: id,
        user_id: user.id,
      });

      if (joinError) {
        if (joinError.code === "23505") {
          showAlert({
            title: "Info",
            message: "You have already joined this event",
            type: 'info',
          });
        } else {
          throw joinError;
        }
      } else {
        trackAction("join_success", { eventId: eventData.id, price: eventData.price });

        // Notify organizer
        if (eventData.organizerId) {
          const { data: organizerData } = await supabase
            .from("users")
            .select("name")
            .eq("id", eventData.organizerId)
            .single();

          if (organizerData) {
            await notifyNewAttendee(
              supabase,
              eventData.id,
              eventData.organizerId,
              user.fullName || "Someone",
            );
          }
        }
        
        // Send event access details (online link or onsite location) to the attendee
        await notifyAttendeeEventAccessDetails(supabase, eventData.id, user.id);

        // Update user spend
        const eventPrice =
          typeof eventData.price === "string"
            ? parseFloat(eventData.price.replace("$", "")) || 0
            : eventData.price;

        if (eventPrice > 0) {
          const { data: userData } = await supabase
            .from("users")
            .select("total_spend")
            .eq("id", user.id)
            .single();

          await supabase
            .from("users")
            .update({ total_spend: (userData?.total_spend || 0) + eventPrice })
            .eq("id", user.id);
        }

        notificationManager.setHasUnreadNotifications(true);
        notificationManager.setHasUnreadEvents(true);
        showAlert({
          title: "Success",
          message: "You have joined the event!",
          type: 'success',
        });
        setIsAttending(true);
      }
    } catch (err: any) {
      console.error("Join Error:", err);
      if (eventData) {
        trackAction("join_error", { eventId: eventData.id, error: err.message });
      }
      showAlert({
        title: "Error",
        message: err.message || "Failed to join event",
        type: 'error',
      });
    } finally {
      setIsJoining(false);
    }
  }, [user, eventData, isAttending, supabase, id, trackAction, showAlert, notifyNewAttendee, notifyAttendeeEventAccessDetails, t]);

  const handleCancelAttendance = async () => {
    setCancelType("attendance");
    setCancellationReason("");
    setShowCancelModal(true);
  };

  const handleConfirmAttendanceCancellation = async () => {
    if (!user || !eventData) return;

    setIsCancelling(true);
    trackAction("cancel_attendance", {
      eventId: eventData.id,
      title: eventData.title,
      reason: cancellationReason.trim() || "No reason provided",
    });
    try {
      const { error: cancelError } = await supabase
        .from("attendees")
        .delete()
        .eq("event_id", eventData.id)
        .eq("user_id", user.id);

      if (cancelError) throw cancelError;

      if (eventData.organizerId) {
        await notifyAttendeeCancellation(
          supabase,
          eventData.id,
          eventData.organizerId,
          user.fullName || "Someone",
          cancellationReason.trim()
        );
      }

      notificationManager.setHasUnreadNotifications(true);
      notificationManager.setHasUnreadEvents(true);
      showAlert({
        title: "Cancelled",
        message: "Your attendance has been cancelled.",
        type: 'info',
      });
      setIsAttending(false);
      setShowCancelModal(false);
    } catch (err: any) {
      console.error("Cancel attendance error:", err);
      trackAction("cancel_attendance_error", {
        eventId: eventData.id,
        error: err.message,
      });
      showAlert({
        title: "Error",
        message: err.message || "Failed to cancel your attendance",
        type: 'error',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCancelEventPress = () => {
    setCancelType("event");
    setCancellationReason("");
    setShowCancelModal(true);
  };

  const handleConfirmEventCancellation = async () => {
    if (!user || !eventData) return;

    setIsCancellingEvent(true);
    const reason = cancellationReason.trim();
    try {
      const { error: updateError } = await supabase
        .from("events")
        .update({
          status: "canceled",
          cancellation_reason: cancellationReason.trim(),
        })
        .eq("id", eventData.id);

      if (updateError) throw updateError;

      await notifyEventCancellation(
        supabase,
        eventData.id,
        reason || "No reason provided"
      );

      trackAction("cancel_event", {
        eventId: eventData.id,
        reason: reason,
      });

      showAlert({
        title: t("event_cancel_event"),
        message: t("event_cancel_success"),
        type: "success",
      });
      
      setShowCancelModal(false);
      // We should ideally refetch here or update local state
      router.replace("/(tabs)");
    } catch (err: any) {
      console.error("Cancel event error:", err);
      showAlert({
        title: "Error",
        message: err.message || "Failed to cancel event",
        type: "error",
      });
    } finally {
      setIsCancellingEvent(false);
    }
  };

  const handleSubmitQuestion = React.useCallback(async () => {
    if (!user || !eventData) {
      showAlert({
        title: "Error",
        message: "You must be logged in to ask questions",
        type: 'error',
      });
      return;
    }

    if (eventData.status === "canceled") {
      showAlert({
        title: t("error_title"),
        message: t("error_event_canceled"),
        type: "error",
      });
      return;
    }

    if (!newQuestion.trim()) {
      showAlert({
        title: t("error_title"),
        message: t("event_question_empty_error"),
        type: "error",
      });
      return;
    }

    setSubmittingQuestion(true);
    try {
      const { data, error: questionError } = await supabase
        .from("event_questions")
        .insert({
          event_id: eventData.id,
          user_id: user.id,
          organizer_id: eventData.organizerId || user.id,
          question: newQuestion.trim(),
        })
        .select()
        .single();

      if (questionError) throw questionError;

      if (data) {
        setQuestions((prev) => [data as EventQuestion, ...prev]);
        setNewQuestion("");

        // Notify organizer if not asking themselves
        if (eventData.organizerId && eventData.organizerId !== user.id) {
          await notifyNewQuestion(
            supabase,
            eventData.id,
            eventData.organizerId,
            data.id,
            user.id,
            user.fullName || "Someone",
            newQuestion.trim(),
          );
        }
      }
    } catch (err: any) {
      console.error("Question submission error:", err);
      showAlert({
        title: "Error",
        message: err.message || t("event_question_submit_error"),
        type: 'error',
      });
    } finally {
      setSubmittingQuestion(false);
    }
  }, [user, eventData, newQuestion, supabase, notifyNewQuestion, showAlert]);

  const handleAnswerQuestion = React.useCallback(async (questionId: string, answer: string) => {
    if (!user || !eventData) return;
    if (!answer.trim()) return;

    try {
      const { error: answerError } = await supabase
        .from("event_questions")
        .update({
          answer: answer.trim(),
          organizer_id: user.id,
          answered_at: new Date().toISOString(),
        })
        .eq("id", questionId);

      if (answerError) throw answerError;

      // Update local state
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? {
                ...q,
                answer: answer.trim(),
                organizer_id: user.id,
                answered_at: new Date().toISOString(),
              }
            : q,
        ),
      );

      // Notify the question asker
      const question = questions.find((q) => q.id === questionId);
      if (question && question.user_id !== user.id) {
        await notifyQuestionAnswer(
          supabase,
          eventData.id,
          question.user_id,
          user.fullName || "Organizer"
        );
      }
    } catch (err: any) {
      console.error("Answer submission error:", err);
      showAlert({
        title: "Error",
        message: err.message || "Failed to submit answer",
        type: 'error',
      });
    }
  }, [user, eventData, supabase, questions, notifyQuestionAnswer, showAlert]);

  React.useEffect(() => {
    if (autoCancel === "true" && isAttending && !isCancelling) {
      handleCancelAttendance();
    }
  }, [autoCancel, isAttending, isCancelling]);

  React.useEffect(() => {
    if (!eventData) return;
    if (ratingDismissed) return;
    if (!isAttending) return;
    if (user?.id === eventData.organizerId) return;
    if (eventData.status === "canceled") return;
    if (!isEnded) return;
    setShowRatingSheet(true);
  }, [eventData, isAttending, isEnded, ratingDismissed, user?.id]);

  const handleSubmitRating = async (rating: number, comment: string) => {
    if (!user || !eventData) return;
    if (ratingSubmitting) return;
    setRatingSubmitting(true);
    try {
      const { error: ratingError } = await supabase.from("ratings").insert({
        event_id: eventData.id,
        user_id: user.id,
        rating,
        review: comment || null,
      });

      if (ratingError) {
        throw ratingError;
      }

      showAlert({
        title: t("rating_thanks_title") || "Thank you!",
        message: t("rating_thanks_message") || "Your rating has been submitted.",
        type: "success",
      });
      setRatingDismissed(true);
    } catch (err: any) {
      console.error("Rating submission error:", err);
      showAlert({
        title: "Error",
        message: err.message || t("rating_error") || "Failed to submit rating",
        type: "error",
      });
    } finally {
      setRatingSubmitting(false);
    }
  };

  if (loading || attendanceLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !eventData) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>
            {error || t("error_generic")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isOrganizer = user?.id === eventData.organizerId;


  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)");
            }
          }}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name={language === 'ar' ? "chevron-forward" : "chevron-back"} size={28} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.logo}>{t("event_details_title")}</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={async () => {
              if (!eventData) return;
              trackAction("share_event_details", { eventId: eventData.id, title: eventData.title });
              await shareEvent({
                id: eventData.id,
                title: eventData.title,
                date: eventData.rawDate,
                is_online: false,
                location: eventData.location,
              });
            }}
            style={styles.shareHeaderButton}
            activeOpacity={0.7}
          >
            <Ionicons name="share-outline" size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        {/* Banner */}
        <View style={styles.bannerContainer}>
          {eventData.image && (
            <Image
              source={{ uri: eventData.image }}
              style={styles.bannerImage}
              contentFit="cover"
            />
          )}
        </View>

        {/* Organizer + Title */}
        <View style={styles.profileHeader}>
          <View style={styles.organizerAvatar}>
            {eventData.organizerImage && (
              <Image
                source={{ uri: eventData.organizerImage }}
                style={styles.avatarImage}
                contentFit="cover"
              />
            )}
          </View>
          <View style={styles.titleInfo}>
            <Text style={styles.eventTitleText}>{eventData.title}</Text>
            <Text style={styles.organizerNameText}>{eventData.organizer}</Text>
          </View>
        </View>

        {/* Status Badge & Reason */}
        {(eventData.status === "canceled" || isEnded) && (
          <View style={[styles.statusBanner, eventData.status === "canceled" ? styles.canceledBanner : styles.endedBanner]}>
            <View style={styles.statusLabelRow}>
              <Ionicons 
                name={eventData.status === "canceled" ? "close-circle" : "time"} 
                size={20} 
                color={Colors.white} 
              />
              <Text style={styles.statusText}>
                {eventData.status === "canceled" ? t("event_canceled") : t("event_ended")}
              </Text>
            </View>
            {eventData.status === "canceled" && eventData.cancellationReason && (
              <Text style={styles.cancellationReasonText}>
                {t("event_cancellation_reason")}: {eventData.cancellationReason}
              </Text>
            )}
          </View>
        )}

        {/* Details: Location, Date/Time, Price, Gender */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons 
                name={eventData.isOnline ? "globe-outline" : "location-sharp"} 
                size={18} 
                color={Colors.primary} 
              />
              <Text style={styles.detailText}>{eventData.location}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
              <Text style={styles.detailText}>{dateLabel} - {eventData.time}</Text>
            </View>
          </View>

          <View style={[styles.detailRow, { marginTop: 15 }]}>
            <View style={styles.priceGenderRow}>
              <Text style={styles.priceBold}>{eventData.price}</Text>
              <View style={styles.genderContainer}>
                {eventData.gender.toLowerCase() === "male" && (
                  <Ionicons name="male" size={18} color={Colors.primary} />
                )}
                {eventData.gender.toLowerCase() === "female" && (
                  <Ionicons name="female" size={18} color={Colors.primary} />
                )}
                {eventData.gender.toLowerCase() === "all" && (
                  <>
                    <Ionicons name="male" size={18} color={Colors.primary} />
                    <Ionicons name="female" size={18} color={Colors.primary} style={{ marginLeft: 4 }} />
                  </>
                )}
                <Text style={styles.genderDetail}>
                  {t(`event_gender_${eventData.gender.toLowerCase()}` as TranslationKey)}
                  {eventData.gender.toLowerCase() !== "all" ? ` ${t("event_only")}` : ""}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Attendees count + Avatar pile */}
        <View style={styles.attendeesSection}>
          <Text style={styles.attendingCountText}>
            {eventData.attendingCount} {t("event_attending")}
          </Text>
          <View style={styles.avatarPileContainer}>
            {eventData.attendingAvatars.map((avatarSource, idx) => {
              const isUrl = avatarSource.startsWith("http") || avatarSource.startsWith("data:");
              return isUrl ? (
                <Image
                  key={idx}
                  source={{ uri: avatarSource }}
                  style={[
                    styles.pileAvatar,
                    {
                      backgroundColor: Colors.lightblack,
                      borderColor: Colors.primary,
                      marginLeft: idx === 0 ? 0 : -15,
                    },
                  ]}
                  contentFit="cover"
                />
              ) : (
                <View
                  key={idx}
                  style={[
                    styles.pileAvatar,
                    {
                      backgroundColor: avatarSource, // If it's a color fallback
                      borderColor: Colors.primary,
                      marginLeft: idx === 0 ? 0 : -15,
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t("event_about")}</Text>
          <Text style={styles.descriptionText}>
            {eventData.description && eventData.description.trim() ? eventData.description : "No description provided."}
          </Text>
        </View>

        {/* Tags */}
        {eventData.tags && eventData.tags.length > 0 && (
          <View style={[styles.section, styles.tagsSection]}>
            <Text style={styles.sectionHeader}>{t("event_tags")}</Text>
            <View style={styles.tagsList}>
              {eventData.tags.map((tag: string, idx: number) => (
                <TagPill key={idx} label={tag} isActive={false} onPress={() => {}} />
              ))}
            </View>
          </View>
        )}

        {/* Q&A Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t("event_questions_header")}</Text>
          {canAskQuestion && (
            <View style={styles.askQuestionBar}>
              <View style={styles.askQuestionContainer}>
                <TextInput
                  style={[styles.askQuestionInput, isRTL && styles.inputRtl]}
                  placeholder={t("event_question_placeholder")}
                  placeholderTextColor={Colors.gray}
                  value={newQuestion}
                  onChangeText={setNewQuestion}
                  onFocus={() => scrollRef.current?.scrollToEnd({ animated: true })}
                  multiline
                />
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={handleSubmitQuestion}
                  disabled={submittingQuestion}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={
                      language === "ar"
                        ? "arrow-back-circle"
                        : "arrow-forward-circle"
                    }
                    size={28}
                    color={submittingQuestion ? Colors.textSecondary : Colors.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}
          {questionsLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <>
              {answeredQuestions.length === 0 ? (
                <Text style={styles.emptyQuestionsText}>
                  {t("event_questions_empty")}
                </Text>
              ) : (
                <View style={styles.questionsList}>
                  {answeredQuestions.map((q) => (
                    <QuestionItem
                      key={q.id}
                      question={q}
                      isOrganizer={isOrganizer}
                      onAnswer={handleAnswerQuestion}
                      language={language}
                      t={t}
                    />
                  ))}
                </View>
              )}
            </>
          )}

        </View>

        {/* Edit / Join / Cancel Button */}
        {isOrganizer ? (
          <View style={styles.organizerActions}>
            <Button
              title={t("event_edit")}
              onPress={() =>
                router.push({
                  pathname: "/add",
                  params: { editId: eventData.id },
                })
              }
              style={[styles.joinButtonMargin, { flex: 1 }]}
            />
            {eventData.status !== "canceled" && (
              <Button
                title={t("event_cancel_event")}
                onPress={handleCancelEventPress}
                style={[styles.joinButtonMargin, { flex: 1, backgroundColor: Colors.error }]}
                textStyle={{ color: Colors.white }}
              />
            )}
          </View>
        ) : isAttending ? (
          <Button
            title={
              isCancelling
                ? t("event_cancelling_attendance")
                : t("event_cancel_attendance")
            }
            onPress={handleCancelAttendance}
            disabled={isCancelling}
            style={styles.joinButtonMargin}
          />
        ) : (
          <Button
            title={isJoining ? t("event_joining") : t("event_join")}
            onPress={handleJoin}
            disabled={isJoining || eventData.status === "canceled" || isEnded}
            style={styles.joinButtonMargin}
          />
        )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Cancel Event Reason Modal */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {cancelType === "event" ? t("event_cancel_event") : t("event_cancel_attendance")}
            </Text>
            <Text style={styles.modalSubtitle}>
              {cancelType === "event" 
                ? t("event_cancel_event_confirm_message") 
                : t("event_cancel_attendance_confirm_message")}
            </Text>
            
            <TextInput
              style={styles.reasonInput}
              placeholder={t("event_cancellation_reason_placeholder")}
              placeholderTextColor={Colors.gray}
              value={cancellationReason}
              onChangeText={setCancellationReason}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setShowCancelModal(false)}
              >
                <Text style={styles.cancelModalButtonText}>{t("btn_cancel")}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmModalButton]}
                onPress={cancelType === "event" ? handleConfirmEventCancellation : handleConfirmAttendanceCancellation}
                disabled={isCancellingEvent || isCancelling}
              >
                {isCancellingEvent || isCancelling ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.confirmModalButtonText}>
                    {cancelType === "event" ? t("event_cancel_event") : t("event_cancel_attendance")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <RatingBottomSheet
        visible={showRatingSheet}
        eventTitle={eventData.title}
        onClose={() => {
          setShowRatingSheet(false);
          setRatingDismissed(true);
        }}
        onSubmit={handleSubmitRating}
      />
    </SafeAreaView>
  );
}

// QuestionItem Component
interface QuestionItemProps {
  question: EventQuestion;
  isOrganizer: boolean;
  onAnswer: (questionId: string, answer: string) => Promise<void>;
  language: string;
  t: (key: any) => string;
}

const QuestionItem = ({ question, isOrganizer, onAnswer, language, t }: QuestionItemProps) => {
  const [answerText, setAnswerText] = React.useState(question.answer || "");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const canAnswer = isOrganizer && !question.answer;
  const isRTL = language === "ar";
  const hasOrganizerAnswer = !!question.answer && !!question.organizer_id;

  const handleSubmit = async () => {
    if (!answerText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onAnswer(question.id, answerText.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.questionItem}>
      <Text style={[styles.questionText, isRTL && styles.textRtl]}>{question.question}</Text>
      {hasOrganizerAnswer ? (
        <Text style={[styles.answerText, isRTL && styles.textRtl]}>{question.answer}</Text>
      ) : canAnswer ? (
        <View style={styles.answerInputRow}>
          <TextInput
            style={[styles.answerInput, isRTL && styles.inputRtl]}
            placeholder={t("event_answer_placeholder")}
            placeholderTextColor={Colors.gray}
            value={answerText}
            onChangeText={setAnswerText}
            multiline
          />
          <TouchableOpacity
            style={styles.answerSendButton}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <Ionicons
              name={language === "ar" ? "arrow-back-circle" : "arrow-forward-circle"}
              size={24}
              color={isSubmitting ? Colors.textSecondary : Colors.primary}
            />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  logo: {
    color: Colors.white,
    fontSize: 20,
    fontFamily: Fonts.bold,
  },
  backButton: {
    padding: 5,
  },
  shareHeaderButton: {
    padding: 5,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: Colors.primary,
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  organizerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: Colors.lightblack,
    borderRadius: 20,
    padding: 25,
    borderWidth: 1,
    borderColor: Colors.whiteTransparentMedium,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: Colors.white,
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  reasonInput: {
    backgroundColor: Colors.black,
    borderRadius: 12,
    padding: 15,
    color: Colors.white,
    fontFamily: Fonts.regular,
    fontSize: 16,
    height: 120,
    textAlignVertical: 'top',
    marginBottom: 25,
    borderWidth: 1,
    borderColor: Colors.whiteTransparentVeryLight,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  modalButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelModalButton: {
    backgroundColor: Colors.whiteTransparentVeryLight,
  },
  confirmModalButton: {
    backgroundColor: Colors.error,
  },
  cancelModalButtonText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.semibold,
    fontSize: 16,
  },
  confirmModalButtonText: {
    color: Colors.white,
    fontFamily: Fonts.semibold,
    fontSize: 16,
  },
  bannerContainer: {
    height: 150,
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 10,
    backgroundColor: Colors.lightblack,
    
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  organizerAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.lightblack,
    marginRight: 15,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  titleInfo: {
    flex: 1,
  },
  eventTitleText: {
    color: Colors.white,
    fontSize: 22,
    fontFamily: Fonts.bold,
    marginBottom: 2,
  },
  organizerNameText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  detailsContainer: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  detailText: {
    color: Colors.white,
    fontSize: 14,
    fontFamily: Fonts.medium,
    marginLeft: 8,
  },
  priceBold: {
    color: Colors.white,
    fontSize: 22,
    fontFamily: Fonts.bold,
    marginRight: 15,
  },
  priceGenderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  genderContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  genderDetail: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: Fonts.medium,
    marginLeft: 4,
  },
  attendeesSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 25,
    marginTop: 5,
  },
  attendingCountText: {
    color: Colors.white,
    fontSize: 18,
    fontFamily: Fonts.bold,
  },
  avatarPileContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  pileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    overflow: "hidden",
  },
  section: {
    marginBottom: 6,
  },
  sectionHeader: {
    color: Colors.white,
    fontSize: 22,
    fontFamily: Fonts.semibold,
    marginBottom: 12,
  },
  descriptionText: {
    color: Colors.white,
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.9,
    fontFamily: Fonts.medium,
  },
  tagsSection: {
    marginTop: 5,
  },
  tagsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  joinButtonMargin: {
    marginTop: 6,
  },
  questionsList: {
    marginTop: 8,
    gap: 10,
  },
  questionItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightblack,
  },
  questionText: {
    color: Colors.white,
    fontSize: 14,
    fontFamily: Fonts.medium,
    marginBottom: 4,
  },
  answerText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: Fonts.regular,
  },
  answerInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  answerInput: {
    flex: 1,
    backgroundColor: Colors.lightblack,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: Colors.white,
    fontSize: 13,
    fontFamily: Fonts.regular,
    textAlignVertical: "top",
  },
  answerSendButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyQuestionsText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
  askQuestionBar: {
    paddingBottom: 10,
    paddingTop: 6,
    marginBottom: 6,
  },
  askQuestionContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.lightblack,
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: Colors.lightblack,
  },
  askQuestionInput: {
    flex: 1,
    color: Colors.white,
    fontSize: 14,
    fontFamily: Fonts.regular,
    paddingVertical: 8,
    marginRight: 8,
    textAlignVertical: "top",
  },
  inputRtl: {
    textAlign: "right",
    writingDirection: "rtl",
  },
  textRtl: {
    textAlign: "right",
    writingDirection: "rtl",
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBanner: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  canceledBanner: {
    backgroundColor: Colors.error + '30',
    borderWidth: 1,
    borderColor: Colors.error,
  },
  endedBanner: {
    backgroundColor: Colors.gray + '30',
    borderWidth: 1,
    borderColor: Colors.gray,
  },
  statusLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 5,
  },
  statusText: {
    color: Colors.white,
    fontFamily: Fonts.bold,
    fontSize: 16,
  },
  cancellationReasonText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
});
