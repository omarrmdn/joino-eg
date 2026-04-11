import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import * as Updates from "expo-updates";
import React, {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import { DevSettings, I18nManager } from "react-native";

import { getGeoInfoByIP } from "../utils/ip";

type Language = "en" | "ar-EG";

export type TranslationKey =
  | "tab_home"
  | "tab_my_events"
  | "tab_messages"
  | "tab_you"
  | "info_title"
  | "success_title"
  | "event_already_joined"
  | "event_join_success"
  | "event_cancel_attendance_success"
  | "events_my_events_title"
  | "events_empty"
  | "event_details_title"
  | "event_about"
  | "event_tags"
  | "event_questions"
  | "event_questions_header"
  | "event_questions_empty"
  | "event_question_placeholder"
  | "event_send_question"
  | "event_sending_question"
  | "event_join"
  | "event_joining"
  | "event_attending"
  | "event_cancel_attendance"
  | "event_cancelling_attendance"
  | "rating_title"
  | "rating_title_generic"
  | "rating_subtitle"
  | "rating_placeholder"
  | "rating_submit"
  | "rating_submitting"
  | "rating_skip"
  | "rating_thanks_title"
  | "rating_thanks_message"
  | "rating_error"
  | "event_edit"
  | "create_event_title"
  | "edit_event_title"
  | "create_event_banner_hint"
  | "create_event_image_size_hint"
  | "create_event_title_placeholder"
  | "create_event_description_placeholder"
  | "create_event_type_label"
  | "create_event_online"
  | "create_event_onsite"
  | "create_event_location_online"
  | "create_event_location_onsite"
  | "create_event_schedule_label"
  | "create_event_start_date"
  | "create_event_end_date"
  | "create_event_time"
  | "create_event_end_time"
  | "create_event_end_label"
  | "create_event_capacity"
  | "create_event_cost"
  | "create_event_tags_label"
  | "create_event_tags_placeholder"
  | "create_event_gender_label"
  | "create_event_gender_all"
  | "create_event_gender_males"
  | "create_event_gender_females"
  | "create_event_gender_male"
  | "create_event_gender_female"
  | "create_event_publishing"
  | "create_event_publish"
  | "create_event_saving"
  | "create_event_save_changes"
  | "notifications_title"
  | "notifications_loading"
  | "notifications_empty"
  | "settings_title"
  | "settings_language"
  | "settings_language_description"
  | "settings_language_en"
  | "settings_language_ar_eg"
  | "messages_title"
  | "messages_empty_title"
  | "messages_empty_body"
  | "profile_account"
  | "profile_settings"
  | "profile_support"
  | "profile_report_bug"
  | "profile_total_spend"
  | "profile_total_revenue"
  | "profile_ad_center"
  | "profile_interests"
  | "profile_edit"
  | "profile_done"
  | "profile_no_interests"
  | "profile_search_interests_placeholder"
  | "create_event_description_tip"
  | "event_online_link_auto_tip"
  | "event_onsite_location_auto_tip"
  | "error_generic"
  | "error_required_fields"
  | "error_location_required_onsite"
  | "error_link_required_online"
  | "error_invalid_online_link"
  | "error_login_required"
  | "error_past_date_title"
  | "error_past_date_message"
  | "error_permission_photos"
  | "event_question_empty_error"
  | "event_question_submitted_title"
  | "event_question_submitted"
  | "event_question_submit_error"
  | "error_capacity_price_invalid"
  | "error_location_google_required"
  | "notifications_type_new_attendee"
  | "notifications_type_attendee_cancel"
  | "notifications_type_event_reminders"
  | "notifications_type_questions"
  | "notifications_type_new_events_nearby"
  | "notifications_type_event_stats"
  | "notifications_type_push_enabled"
  | "notifications_save"
  | "notifications_saving"
  | "notifications_save_error"
  | "error_notification_preference"
  | "location_near_me"
  | "settings_sign_out"
  | "settings_sign_out_confirm_title"
  | "settings_sign_out_confirm_message"
  | "settings_sign_out_cancel"
  | "settings_sign_out_confirm"
  | "location_permission_msg"
  | "location_error_msg"
  | "location_retry_title"
  | "location_settings_title"
  | "location_settings_msg"
  | "btn_no_thanks"
  | "btn_ok"
  | "btn_cancel"
  | "btn_open_settings"
  | "event_by"
  | "event_description"
  | "event_gender"
  | "event_gender_male"
  | "event_gender_female"
  | "event_gender_all"
  | "event_no_questions"
  | "event_answer"
  | "event_answer_placeholder"
  | "event_no_answer_yet"
  | "event_not_found"
  | "create_event_delete"
  | "create_event_delete_confirm_title"
  | "create_event_delete_confirm_message"
  | "create_event_promote"
  | "promotion_price_title"
  | "promotion_fill_seats"
  | "promotion_compliance_note"
  | "promotion_continue"
  | "home_featured_popular"
  | "home_featured_interested"
  | "home_featured_suggested"
  | "onboarding_title"
  | "onboarding_subtitle"
  | "onboarding_google_button"
  | "onboarding_terms"
  | "search_results_title"
  | "search_empty_results"
  | "search_placeholder"
  | "event_attending_status"
  | "btn_yes_cancel"
  | "promote_modal_title"
  | "promote_modal_subtitle"
  | "promote_modal_boost_button"
  | "promote_modal_secondary_action"
  | "home_nearby"
  | "home_trending"
  | "home_no_events"
  | "home_no_events_tag"
  | "error_title"
  | "settings_reload_note"
  | "profile_update_failed"
  | "profile_update_failed_msg"
  | "profile_name_empty"
  | "profile_update_profile_failed"
  | "profile_permission_photos"
  | "profile_permission_photos_msg"
  | "profile_file_too_large"
  | "profile_file_too_large_msg"
  | "profile_update_success"
  | "profile_update_success_msg"
  | "profile_update_image_failed"
  | "profile_load_failed"
  | "profile_name_placeholder"
  | "profile_user_name_fallback"
  | "create_event_repeat_weekly"
  | "create_event_repeat_helper_prefix"
  | "create_event_repeat_helper_until"
  | "create_event_repeat_helper_no_end"
  | "create_event_edit_login_required"
  | "create_event_edit_not_allowed"
  | "create_event_edit_not_allowed_msg"
  | "create_event_repeat_note_prefix"
  | "chat_organizer_of"
  | "chat_attendee"
  | "chat_type_message"
  | "chat_yesterday"
  | "chat_unknown_user"
  | "chat_general_role"
  | "event_only"
  | "notification_new_attendee_title"
  | "notification_new_attendee_body"
  | "notification_event_access_online_title"
  | "notification_event_access_onsite_title"
  | "notification_event_access_online_body"
  | "notification_event_access_onsite_body"
  | "notification_cancellation_title"
  | "notification_cancellation_body"
  | "notification_reminder_title"
  | "notification_reminder_body"
  | "notification_question_title"
  | "notification_question_body"
  | "notification_answer_title"
  | "notification_answer_body"
  | "notification_nearby_title"
  | "notification_nearby_body"
  | "notification_message_title"
  | "notification_message_body"
  | "notification_recommendation_title"
  | "notification_recommendation_body"
  | "notification_event_update_title"
  | "notification_event_update_body_link"
  | "profile_follow_us"
  | "event_canceled"
  | "event_ended"
  | "event_cancellation_reason"
  | "event_cancel_event"
  | "event_cancel_event_confirm_title"
  | "event_cancel_event_confirm_message"
  | "event_cancellation_reason_placeholder"
  | "error_event_canceled"
  | "error_event_ended"
  | "error_event_overlap"
  | "notification_event_canceled_title"
  | "notification_event_canceled_body"
  | "notification_event_posted_title"
  | "notification_event_posted_body"
  | "notification_attendee_cancel_confirmation_title"
  | "notification_attendee_cancel_confirmation_body"
  | "event_cancel_success"
  | "event_posted_success"
  | "event_updated_success"
  | "event_cancel_attendance_confirm_message"
  | "today"
  | "filters"
  | "max_price"
  | "event_type"
  | "gender"
  | "all"
  | "online"
  | "onsite"
  | "male"
  | "female"
  | "near_me"
  | "reset"
  | "apply"
  | "tab_search"
  | "search_input_placeholder"
  | "recurrence_daily"
  | "recurrence_weekly"
  | "recurrence_biweekly"
  | "recurrence_monthly"
  | "recurrence_every"
  | "event_cancellation_reason_organizer_deleted"
  | "settings_currency"
  | "settings_currency_description"
  | "report_bug_title"
  | "report_bug_error"
  | "report_bug_success"
  | "bug_report_description_label"
  | "bug_report_description_placeholder"
  | "bug_report_description_error"
  | "bug_report_images_label"
  | "bug_report_add_image"
  | "bug_report_submit"
  | "event_no_description";

type Translations = Record<Language, Record<TranslationKey, string>>;

export const translations: Translations = {
  en: {
    tab_home: "Home",
    tab_my_events: "My Events",
    info_title: "Info",
    success_title: "Success",
    event_already_joined: "You have already joined this event.",
    event_join_success: "You have joined the event!",
    event_cancel_attendance_success: "Your attendance has been cancelled.",
    tab_messages: "Messages",
    tab_you: "You",
    events_my_events_title: "My Events",
    events_empty: "You haven't organized any events yet.",
    event_details_title: "Event Details",
    event_about: "About Event",
    event_tags: "Tags",
    event_questions: "Questions",
    event_questions_header: "Questions & Answers",
    event_questions_empty: "No questions yet. Be the first to ask!",
    event_attending: "attending",
    event_question_placeholder: "Ask a question about this event",
    event_send_question: "Send Question",
    event_sending_question: "Sending...",
    event_join: "Join",
    event_joining: "Joining...",
    event_attending_status: "Attending",
    event_cancel_attendance: "Cancel Attendance",
    event_cancelling_attendance: "Cancelling...",
    rating_title: "Rate this event",
    rating_title_generic: "Rate this event",
    rating_subtitle: "How was your experience?",
    rating_placeholder: "Share an optional comment",
    rating_submit: "Submit rating",
    rating_submitting: "Submitting...",
    rating_skip: "Not now",
    rating_thanks_title: "Thank you!",
    rating_thanks_message: "Your rating has been submitted.",
    rating_error: "Failed to submit rating",
    event_edit: "Edit Event",
    create_event_title: "Create Event",
    edit_event_title: "Edit Event",
    create_event_banner_hint: "Add Banner",
    create_event_image_size_hint: "Recommended: 1200 × 900 px (4:3 ratio)",
    create_event_title_placeholder: "Event Title",
    create_event_description_placeholder: "Description (Optional)",
    create_event_type_label: "Event Type",
    create_event_online: "Online",
    create_event_onsite: "Onsite",
    create_event_location_online: "Event Meeting Link",
    create_event_location_onsite: "Physical Location",
    create_event_schedule_label: "Schedule",
    create_event_start_date: "Start Date",
    create_event_end_date: "End Date",
    create_event_time: "Time",
    create_event_end_time: "End Time",
    create_event_end_label: "End Schedule",
    create_event_capacity: "Capacity",
    create_event_cost: "Cost",
    create_event_tags_label: "Tags",
    create_event_tags_placeholder: "Search or add tags...",
    create_event_gender_label: "Target Gender",
    create_event_gender_all: "All",
    create_event_gender_males: "Males",
    create_event_gender_females: "Females",
    create_event_gender_male: "Males",
    create_event_gender_female: "Females",
    create_event_publishing: "Publishing...",
    create_event_publish: "Publish",
    create_event_saving: "Saving...",
    create_event_save_changes: "Save Changes",
    notifications_title: "Notifications",
    notifications_loading: "Loading notifications...",
    notifications_empty: "No notifications yet",
    notifications_type_new_attendee: "New Attendee",
    notifications_type_attendee_cancel: "Attendee Cancel",
    notifications_type_event_reminders: "Event Reminders",
    notifications_type_questions: "New Questions",
    notifications_type_new_events_nearby: "New Events Nearby",
    notifications_type_event_stats: "Event Stats",
    notifications_type_push_enabled: "Enable Push Notifications",
    notifications_save: "Save Preferences",
    notifications_saving: "Saving...",
    notifications_save_error: "Failed to save preferences.",
    location_near_me: "Near me",
    settings_title: "Settings",
    settings_language: "Language",
    settings_language_description: "Choose your preferred app language.",
    settings_language_en: "English",
    settings_language_ar_eg: "Egyptian Arabic",
    settings_sign_out: "Sign Out",
    settings_sign_out_confirm_title: "Sign Out",
    settings_sign_out_confirm_message: "Are you sure you want to sign out?",
    settings_sign_out_cancel: "Cancel",
    settings_sign_out_confirm: "Sign Out",
    messages_title: "Messages",
    messages_empty_title: "No messages yet.",
    messages_empty_body: "Conversations with organizers and attendees will appear here.",
    profile_account: "Account",
    profile_settings: "Settings",
    profile_support: "Support",
    profile_report_bug: "Report a Problem",
    profile_total_spend: "Total Spend",
    profile_total_revenue: "Total Revenue",
    profile_ad_center: "Ad Center",
    profile_interests: "My Interests",
    profile_edit: "Edit",
    profile_done: "Done",
    profile_no_interests: "No interests added yet. Tap Edit to add some!",
    profile_search_interests_placeholder: "Search interests...",
    create_event_description_tip: "Tip: You can write more details about the event or a detailed location here.",
    event_online_link_auto_tip: "Tip: Event link will be sent automatically to attendees.",
    event_onsite_location_auto_tip: "Tip: Event location will be sent automatically to attendees.",
    event_no_description: "No description provided.",
    error_generic: "An error occurred. Please try again.",
    error_required_fields: "Please fill in all required fields (*) including Date and Time.",
    error_location_required_onsite: "Please enter a location for onsite events.",
    error_link_required_online: "Please enter a link for online events.",
    error_invalid_online_link: "Please enter a valid URL for online events (starting with http:// or https:// and without spaces).",
    error_login_required: "You must be logged in to continue.",
    error_past_date_title: "Invalid date",
    error_past_date_message: "You cannot pick a date that has already passed.",
    error_permission_photos: "We need access to your photos to let you upload an event image.",
    event_question_empty_error: "Please enter a question.",
    event_question_submitted_title: "Success",
    event_question_submitted: "Your question has been submitted.",
    event_question_submit_error: "Failed to submit question.",
    error_capacity_price_invalid: "Please enter a realistic capacity and price (not a phone number).",
    error_location_google_required: "Please select a location from the suggestions so we can pin it on the map.",
    error_notification_preference: "Failed to load notification preferences.",
    location_permission_msg: "Location permission is required to find nearest events",
    location_error_msg: "Could not get your location",
    location_retry_title: "Open location to find near events",
    location_settings_title: "Permission Required",
    location_settings_msg: "Please enable location access in settings to find near events.",
    btn_no_thanks: "No thanks",
    btn_ok: "OK",
    btn_cancel: "Cancel",
    btn_open_settings: "Open Settings",
    event_by: "By",
    event_description: "Description",
    event_gender: "Gender",
    event_gender_male: "Males",
    event_gender_female: "Females",
    event_gender_all: "All",
    event_no_questions: "No questions yet. Be the first to ask!",
    event_answer: "Answer",
    event_answer_placeholder: "Write your answer...",
    event_no_answer_yet: "No answer yet",
    event_not_found: "Event not found",
    create_event_delete: "Delete Event",
    create_event_delete_confirm_title: "Delete Event",
    create_event_delete_confirm_message: "Are you sure you want to delete this event? This action cannot be undone.",
    create_event_promote: "Promote Your Event",
    promotion_price_title: "Price",
    promotion_fill_seats: "Fill all seats",
    promotion_compliance_note: "If we didn't fill your seats you'll get compensation",
    promotion_continue: "Continue To Purchase",
    home_featured_popular: "Popular in",
    home_featured_interested: "Because you're interested in",
    home_featured_suggested: "Suggested for you",
    onboarding_title: "Joyin",
    onboarding_subtitle: "Discover and join the best events happening around you.",
    onboarding_google_button: "Continue with Google",
    onboarding_terms: "By continuing, you agree to our Terms of Service and Privacy Policy.",
    search_results_title: "Search Results",
    search_empty_results: "No results found for",
    search_placeholder: "Search for events, people or tags",
    tab_search: "Search",
    search_input_placeholder: "search",
    btn_yes_cancel: "Yes, Cancel",
    promote_modal_title: "Boost Your Event\nFill Every Seat.",
    promote_modal_subtitle: "Reach The Right Audience, Boost Engagement, And Make Your Event Unforgettable.",
    promote_modal_boost_button: "Boost For EGP50",
    promote_modal_secondary_action: "Or Choose Your Budget",
    home_nearby: "Happening nearby",
    home_trending: "Trending now",
    home_no_events: "No events found",
    home_no_events_tag: "No events with tag",
    error_title: "Error",
    settings_reload_note: "Some screens may need to be reopened for language changes to fully apply.",
    profile_update_failed: "Update Failed",
    profile_update_failed_msg: "Could not save your interests. Please try again.",
    profile_name_empty: "Name cannot be empty",
    profile_update_profile_failed: "Failed to update profile",
    profile_permission_photos: "Permission Denied",
    profile_permission_photos_msg: "We need access to your photos to change your profile picture.",
    profile_file_too_large: "File too large",
    profile_file_too_large_msg: "Please select an image smaller than 5MB.",
    profile_update_success: "Success",
    profile_update_success_msg: "Profile picture updated successfully",
    profile_update_image_failed: "Failed to update profile image",
    profile_load_failed: "Failed to load user data",
    profile_name_placeholder: "Your Name",
    profile_user_name_fallback: "User Name",
    create_event_repeat_weekly: "Repeat weekly",
    create_event_repeat_helper_prefix: "This event will repeat every",
    create_event_repeat_helper_until: "until",
    create_event_repeat_helper_no_end: "with no end date",
    create_event_edit_login_required: "You must be logged in to edit an event",
    create_event_edit_not_allowed: "Not allowed",
    create_event_edit_not_allowed_msg: "You can only edit events you organized.",
    create_event_repeat_note_prefix: "This event repeats every",
    chat_organizer_of: "Organizer Of",
    chat_attendee: "Attendee",
    chat_type_message: "Type a message...",
    chat_yesterday: "Yesterday",
    chat_unknown_user: "Unknown User",
    chat_general_role: "General",
    event_only: "Only",
    notification_new_attendee_title: "New attendee!",
    notification_new_attendee_body: "{name} joined your event \"{title}\"",
    notification_event_access_online_title: "Online event link",
    notification_event_access_onsite_title: "Event location details",
    notification_event_access_online_body: "Join the event \"{title}\" using this link: {link}",
    notification_event_access_onsite_body: "Here is the location for \"{title}\": {location}",
    notification_cancellation_title: "Attendee cancelled",
    notification_cancellation_body: "{name} cancelled their attendance for \"{title}\"",
    notification_reminder_title: "Event reminder!",
    notification_reminder_body: "\"{title}\" is happening in {hours} hours",
    notification_question_title: "New question",
    notification_question_body: "{name} asked a question about \"{title}\"",
    notification_answer_title: "Question answered",
    notification_answer_body: "{name} answered your question about \"{title}\"",
    notification_nearby_title: "Event nearby!",
    notification_nearby_body: "\"{title}\" is happening {distance}km from you",
    notification_message_title: "New message",
    notification_message_body: "{name} sent you a message: {message}",
    notification_recommendation_title: "Event you may like",
    notification_recommendation_body: "We found an event \"{title}\" that matches your interests!",
    notification_event_update_title: "Event Update",
    notification_event_update_body_link: "The meeting link for \"{title}\" has been added/updated. Check it in the event details.",
    profile_follow_us: "Follow Us On",
    event_canceled: "Canceled",
    event_ended: "Ended",
    event_cancellation_reason: "Cancellation Reason",
    event_cancel_event: "Cancel Event",
    event_cancel_event_confirm_title: "Cancel Event",
    event_cancel_event_confirm_message: "Are you sure you want to cancel this event? This will notify all attendees.",
    event_cancellation_reason_placeholder: "Enter reason for cancellation...",
    notification_event_canceled_title: "Event Canceled",
    notification_event_canceled_body: "The event \"{title}\" has been canceled. Reason: {reason}",
    notification_event_posted_title: "Event Posted!",
    notification_event_posted_body: "Your event \"{title}\" is now live and people can join.",
    notification_attendee_cancel_confirmation_title: "Attendance Canceled",
    notification_attendee_cancel_confirmation_body: "You have successfully canceled your attendance for \"{title}\".",
    event_cancel_success: "Event canceled successfully.",
    event_posted_success: "Event posted!",
    event_updated_success: "Event updated!",
    today: "Today",
    filters: "Filters",
    max_price: "Max Price",
    event_type: "Event Type",
    gender: "Gender",
    all: "All",
    online: "Online",
    onsite: "Onsite",
    male: "Male",
    female: "Female",
    near_me: "Near me",
    reset: "Reset",
    apply: "Apply",
    event_cancel_attendance_confirm_message: "Are you sure you want to cancel your attendance? This will notify the organizer.",
    recurrence_daily: "Daily",
    recurrence_weekly: "Weekly",
    recurrence_biweekly: "Bi-weekly",
    recurrence_monthly: "Monthly",
    recurrence_every: "Every",
    event_cancellation_reason_organizer_deleted: "Event deleted by organizer",
    settings_currency: "Currency",
    settings_currency_description: "Choose your preferred currency for event prices.",
    report_bug_title: "Report a Problem",
    report_bug_error: "Failed to submit report. Please try again later.",
    report_bug_success: "Your report has been submitted. Thank you for helping us improve!",
    bug_report_description_label: "What went wrong?",
    bug_report_description_placeholder: "Describe the issue in detail...",
    bug_report_description_error: "Please describe the issue.",
    bug_report_images_label: "Add Screenshots (Max 3)",
    bug_report_add_image: "Add Image",
    bug_report_submit: "Submit",
  },
  "ar-EG": {
    tab_home: "الرئيسية",
    tab_my_events: "إيفنتاتي",
    info_title: "معلومة",
    success_title: "تمام",
    event_already_joined: "إنت مشارك فعلاً في الإيفنت ده.",
    event_join_success: "خلاص انضميت للإيفنت بنجاح!",
    event_cancel_attendance_success: "حجزك اتلغى خلاص.",
    tab_messages: "الرسايل",
    tab_you: "حسابي",
    events_my_events_title: "إيفنتاتي",
    events_empty: "لسه معملتش أي إيفنتات.",
    event_details_title: "تفاصيل الإيفنت",
    event_about: "عن الإيفنت",
    event_tags: "التاجز",
    event_questions: "الأسئلة",
    event_questions_header: "الأسئلة والأجوبة",
    event_questions_empty: "مفيش أسئلة لسه. كون أول واحد يسأل!",
    event_attending: "مشارك",
    event_question_placeholder: "اسأل سؤال عن الإيفنت ده",
    event_send_question: "إرسال السؤال",
    event_sending_question: "بيتبعت...",
    event_join: "انضمام",
    event_joining: "بيضمك...",
    event_attending_status: "مشارك في القائمة",
    event_cancel_attendance: "إلغاء الحضور",
    event_cancelling_attendance: "بيكنسل...",
    rating_title: "قيم الإيفنت ده",
    rating_title_generic: "قيم الإيفنت ده",
    rating_subtitle: "كانت تجربتك إيه؟",
    rating_placeholder: "أضف تعليق اختياري",
    rating_submit: "إرسال التقييم",
    rating_submitting: "بيتبعت...",
    rating_skip: "بعدين",
    rating_thanks_title: "شكراً ليك!",
    rating_thanks_message: "تم إرسال تقييمك.",
    rating_error: "مقدرناش نبعت التقييم",
    event_edit: "تعديل الإيفنت",
    create_event_title: "إيفنت جديد",
    edit_event_title: "تعديل الإيفنت",
    create_event_banner_hint: "أضف صورة",
    create_event_image_size_hint: "الحجم المُوصى: ١٢٠٠ × ٩٠٠ بكسل (نسبة ٤:٣)",
    create_event_title_placeholder: "عنوان الإيفنت",
    create_event_description_placeholder: "الوصف (اختياري)",
    create_event_type_label: "نوع الإيفنت",
    create_event_online: "أونلاين",
    create_event_onsite: "في المكان",
    create_event_location_online: "رابط الاجتماع",
    create_event_location_onsite: "المكان",
    create_event_schedule_label: "المواعيد",
    create_event_start_date: "تاريخ البداية",
    create_event_end_date: "تاريخ النهاية",
    create_event_time: "الوقت",
    create_event_end_time: "وقت النهاية",
    create_event_end_label: "ميعاد النهاية",
    create_event_capacity: "العدد",
    create_event_cost: "التكلفة",
    create_event_tags_label: "التاجز",
    create_event_tags_placeholder: "دور أو أضف تتاج...",
    create_event_gender_label: "الجنس المستهدف",
    create_event_gender_all: "الكل",
    create_event_gender_males: "ولاد",
    create_event_gender_females: "بنات",
    create_event_gender_male: "ولاد",
    create_event_gender_female: "بنات",
    create_event_publishing: "بيتنشر...",
    create_event_publish: "نشر",
    create_event_saving: "بيتحفظ...",
    create_event_save_changes: "حفظ التعديلات",
    notifications_title: "الإشعارات",
    notifications_loading: "بنجيب الإشعارات...",
    notifications_empty: "مفيش إشعارات لسه",
    notifications_type_new_attendee: "مشارك جديد",
    notifications_type_attendee_cancel: "إلغاء اشتراك",
    notifications_type_event_reminders: "تذكير بالإيفنتات",
    notifications_type_questions: "أسئلة جديدة",
    notifications_type_new_events_nearby: "إيفنتات جديدة جنبك",
    notifications_type_event_stats: "إحصائيات الإيفنتات",
    notifications_type_push_enabled: "تفعيل الإشعارات",
    notifications_save: "حفظ التفضيلات",
    notifications_saving: "بيتحفظ...",
    notifications_save_error: "فشل حفظ التفضيلات.",
    location_near_me: "قريب مني",
    settings_title: "الإعدادات",
    settings_language: "اللغة",
    settings_language_description: "اختار لغة التطبيق اللي تحبها.",
    settings_language_en: "English",
    settings_language_ar_eg: "المصرية",
    settings_sign_out: "تسجيل الخروج",
    settings_sign_out_confirm_title: "تسجيل الخروج",
    settings_sign_out_confirm_message: "متأكد إنك عايز تخرج؟",
    settings_sign_out_cancel: "إلغاء",
    settings_sign_out_confirm: "خروج",
    messages_title: "الرسايل",
    messages_empty_title: "مفيش رسايل لسه.",
    messages_empty_body: "أي محادثة مع المنظمين أو المشاركين هتظهر هنا.",
    profile_account: "الحساب",
    profile_settings: "الإعدادات",
    profile_support: "الدعم",
    profile_report_bug: "بلغ عن مشكلة",
    profile_total_spend: "صرفت قد إيه",
    profile_total_revenue: "إجمالي المكسب",
    profile_ad_center: "مركز الإعلانات",
    profile_interests: "اهتماماتي",
    profile_edit: "تعديل",
    profile_done: "تم",
    profile_no_interests: "لسه ما ضفتش أي اهتمامات. دوس تعديل عشان تضيف!",
    profile_search_interests_placeholder: "دور في اهتماماتك...",
    create_event_description_tip: "تلميح: تقدر تكتب تفاصيل أكتر عن الإيفنت أو تفصيل للمكان هنا.",
    event_online_link_auto_tip: "تلميح: رابط الإيفنت هيتبعت تلقائي لكل اللي سجلوا.",
    event_onsite_location_auto_tip: "تلميح: مكان الإيفنت هيتبعت تلقائي لكل اللي سجلوا.",
    error_generic: "حصل مشكلة. حاول تاني كده.",
    error_required_fields: "يا ريت تملى كل الخانات المطلوبة (*) ",
    error_location_required_onsite: "يا ريت تكتب المكان فين بالظبط.",
    error_link_required_online: "يا ريت تحط رابط الإيفنت.",
    error_invalid_online_link: "يا ريت تحط رابط صح (بيبدأ بـ http:// أو https:// ومن غير مسافات).",
    error_login_required: "لازم تسجل دخول عشان تكمل.",
    error_past_date_title: "تاريخ مش صح",
    error_past_date_message: "ما ينفعش تختار تاريخ قديم.",
    error_permission_photos: "محتاجين إذن الوصول للصور عشان تقدر ترفع صورة للإيفنت.",
    event_question_empty_error: "يا ريت تكتب السؤال الأول.",
    event_question_submitted_title: "تمام",
    event_question_submitted: "سؤالك اتبعث بنجاح.",
    event_question_submit_error: "مقدرناش نبعت السؤال.",
    error_capacity_price_invalid: "يا ريت تحط عدد وسعر منطقيين (مش رقم تليفون).",
    error_location_google_required: "اختار المكان من الاقتراحات عشان نعرف نحطه على الخريطة.",
    error_notification_preference: "مقدرناش نجيب تفضيلات الإشعارات.",
    location_permission_msg: "محتاجين إذن الموقع عشان نجيب أقرب الإيفنتات ليك",
    location_error_msg: "مقدرناش نوصّل لمكانك",
    location_retry_title: "افتح الموقع عشان تشوف الإيفنتات القريبة منك",
    location_settings_title: "الإذن مطلوب",
    location_settings_msg: "يا ريت تفعل الوصول للموقع من الإعدادات عشان تشوف الإيفنتات القريبة.",
    btn_no_thanks: "لا شكراً",
    btn_ok: "ماشي",
    btn_cancel: "إلغاء",
    btn_open_settings: "فتح الإعدادات",
    event_by: "بواسطة",
    event_description: "الوصف",
    event_gender: "الجنس",
    event_gender_male: "ولاد",
    event_gender_female: "بنات",
    event_gender_all: "الكل",
    event_no_questions: "مفيش أسئلة لسه. كوني أول واحدة تسأل!",
    event_answer: "الإجابة",
    event_answer_placeholder: "اكتب إجابتك...",
    event_no_answer_yet: "مفيش إجابة لسه",
    event_not_found: "الإيفنت مش موجود",
    create_event_delete: "حذف الإيفنت",
    create_event_delete_confirm_title: "حذف الإيفنت",
    create_event_delete_confirm_message: "متأكد إنك عايز تحذف الإيفنت ده؟ مش هتعرف ترجع في كلامك تاني.",
    create_event_promote: "روج للإيفنت بتاعك",
    promotion_price_title: "السعر",
    promotion_fill_seats: "إملى كل الكراسي",
    promotion_compliance_note: "لو ملمناش الكراسي كلها هتاخد تعويض",
    promotion_continue: "كمل عشان تشتري",
    home_featured_popular: "مشهور في",
    home_featured_interested: "عشان إنت مهتم بـ",
    home_featured_suggested: "مقترحات ليك",
    onboarding_title: "جوين",
    onboarding_subtitle: "استكشف وانضم لأحسن الإيفنتات اللي حواليك.",
    onboarding_google_button: "كمل مع جوجل",
    onboarding_terms: "باستمرارك، إنت بتوافق على شروط الخدمة وسياسة الخصوصية بتاعتنا.",
    search_results_title: "نتائج البحث",
    search_empty_results: "مفيش نتائج لـ",
    search_placeholder: "دور على إيفنتات، ناس، أو تاجز",
    tab_search: "البحث",
    search_input_placeholder: "دور هنا...",
    btn_yes_cancel: "أيوة، كنسل",
    promote_modal_title: "روج لإيفنتك\nواملى كل الأماكن.",
    promote_modal_subtitle: "وصل للناس الصح، وزود التفاعل، وخلي إيفنتك ما يتنسيش.",
    promote_modal_boost_button: "ترويج بـ ٥٠ ج.م",
    promote_modal_secondary_action: "أو اختار ميزانيتك",
    home_nearby: "إيفنتات قريبة منك",
    home_trending: "تريند دلوقتي",
    home_no_events: "مفيش إيفنتات",
    home_no_events_tag: "مفيش إيفنتات بالتاج ده",
    error_event_canceled: "الإيفنت ده اتكنسل .",
    error_event_ended: "هذا الإيفنت انتهى بالفعل.",
    error_event_overlap: "ما ينفعش تنضم للإيفنت ده عشان إنت مشارك في إيفنت تاني في نفس الوقت.",
    error_title: "مشكلة",
    settings_reload_note: "ممكن تحتاج تفتح الشاشات تاني عشان اللغة تتغير بالكامل.",
    profile_update_failed: "فشل التحديث",
    profile_update_failed_msg: "معلش، مقدرناش نحفظ اهتماماتك. حاول تاني.",
    profile_name_empty: "الاسم ما ينفعش يبقى فاضي",
    profile_update_profile_failed: "فشل تحديث البروفايل",
    profile_permission_photos: "الإذن اترفض",
    profile_permission_photos_msg: "محتاجين نوصل لصورك عشان تغير صورتك الشخصية.",
    profile_file_too_large: "الملف كبير أوي",
    profile_file_too_large_msg: "يا ريت تختار صورة أصغر من ٥ ميجابايت.",
    profile_update_success: "نجاح",
    profile_update_success_msg: "تم تحديث الصورة الشخصية بنجاح",
    profile_update_image_failed: "فشل تحديث صورة البروفايل",
    profile_load_failed: "فشل تحميل بياناتك",
    profile_name_placeholder: "اسمك",
    profile_user_name_fallback: "اسم المستخدم",
    create_event_repeat_weekly: "تكرار أسبوعي",
    create_event_repeat_helper_prefix: "الإيفنت ده هيتكرر كل",
    create_event_repeat_helper_until: "لحد",
    create_event_repeat_helper_no_end: "من غير تاريخ نهاية",
    create_event_edit_login_required: "لازم تسجل دخول عشان تعدل الإيفنت",
    create_event_edit_not_allowed: "غير مسموح",
    create_event_edit_not_allowed_msg: "تقدر بس تعدل الإيفنتات اللي إنت نظمتها.",
    create_event_repeat_note_prefix: "الإيفنت ده بيتكرر كل",
    chat_organizer_of: "منظم لـ",
    chat_attendee: "مشارك",
    chat_type_message: "اكتب رسالة...",
    chat_yesterday: "امبارح",
    chat_unknown_user: "مستخدم غير معروف",
    chat_general_role: "عام",
    event_only: "فقط",
    notification_new_attendee_title: "مشارك جديد!",
    notification_new_attendee_body: "{name} انضم لإيفنتك \"{title}\"",
    notification_event_access_online_title: "رابط الإيفنت أونلاين",
    notification_event_access_onsite_title: "تفاصيل مكان الإيفنت",
    notification_event_access_online_body: "انضم للإيفنت \"{title}\" عن طريق الرابط ده: {link}",
    notification_event_access_onsite_body: "ده مكان الإيفنت \"{title}\": {location}",
    notification_cancellation_title: "إلغاء حضور",
    notification_cancellation_body: "{name} كنسل حضوره في \"{title}\"",
    notification_reminder_title: "تذكير بالإيفنت!",
    notification_reminder_body: "إيفنت \"{title}\" هيبدأ كمان {hours} ساعات",
    notification_question_title: "سؤال جديد",
    notification_question_body: "{name} سأل سؤال عن \"{title}\"",
    notification_answer_title: "تم الرد على السؤال",
    notification_answer_body: "{name} رد على سؤالك عن \"{title}\"",
    notification_nearby_title: "إيفنت قريب منك!",
    notification_nearby_body: "إيفنت \"{title}\" على بعد {distance} كم منك",
    notification_message_title: "رسالة جديدة",
    notification_message_body: "{name} بعتلك رسالة: {message}",
    notification_recommendation_title: "إيفنت هيعجبك",
    notification_recommendation_body: "لاقينا إيفنت \"{title}\" ممكن يهمك!",
    notification_event_update_title: "تحديث في الإيفنت",
    notification_event_update_body_link: "رابط الأونلاين بتاع إيفنت \"{title}\" نزل. تقدر تشوفه دلوقتي.",
    profile_follow_us: "تابعنا على",
    event_canceled: "ملغى",
    event_ended: "خلص",
    event_cancellation_reason: "سبب الإلغاء",
    event_cancel_event: "إلغاء الإيفنت",
    event_cancel_event_confirm_title: "إلغاء الإيفنت",
    event_cancel_event_confirm_message: "متأكد إنك عايز تكنسل الإيفنت ؟ هنبلغ كل اللي حاجزين.",
    event_cancellation_reason_placeholder: "اكتب سبب الإلغاء...",
    notification_event_canceled_title: "الإيفنت اتلغى",
    notification_event_canceled_body: "إيفنت \"{title}\" اتكنسل. السبب: {reason}",
    notification_event_posted_title: "الإيفنت نزل!",
    notification_event_posted_body: "الإيفنت بتاعك \"{title}\" نزل دلوقتي والناس تقدر تحجز.",
    notification_attendee_cancel_confirmation_title: "تم إلغاء الحجز",
    notification_attendee_cancel_confirmation_body: "حجزك للإيفنت \"{title}\" اتكنسل بنجاح.",
    event_cancel_success: "تم إلغاء الإيفنت بنجاح.",
    event_posted_success: "الإيفنت اتنشر خلاص!",
    event_updated_success: "تم تحديث الإيفنت!",
    today: "النهاردة",
    filters: "الفلاتر",
    max_price: "أعلى سعر",
    event_type: "نوع الإيفنت",
    gender: "النوع",
    all: "الكل",
    online: "أونلاين",
    onsite: "في المكان",
    male: "ولاد",
    female: "بنات",
    near_me: "قريب مني",
    reset: "إعادة ضبط",
    apply: "تطبيق",
    event_cancel_attendance_confirm_message: "متأكد إنك عايز تكنسل حضورك؟ هنبلغ المنظم.",
    recurrence_daily: "يوميًا",
    recurrence_weekly: "أسبوعيًا",
    recurrence_biweekly: "كل أسبوعين",
    recurrence_monthly: "شهريًا",
    recurrence_every: "كل",
    event_cancellation_reason_organizer_deleted: "الإيفنت اتمسح من المنظم",
    settings_currency: "العملة",
    settings_currency_description: "اختار العملة اللي تحب تشوف بيها أسعار الإيفنتات.",
    report_bug_title: "بلغ عن مشكلة",
    report_bug_error: "مقدرناش نبعت تقرير المشكلة. حاول تاني كمان شوية.",
    report_bug_success: "تقريرك اتبعث خلاص. شكراً إنك بتساعدنا نحسن التطبيق!",
    bug_report_description_label: "إيه اللي حصل غلط؟",
    bug_report_description_placeholder: "اشرح المشكلة بالتفصيل...",
    bug_report_description_error: "يا ريت توصف المشكلة.",
    bug_report_images_label: "أضف صور للمشكلة (٣ كحد أقصى)",
    bug_report_add_image: "أضف صورة",
    bug_report_submit: "إرسال التقرير",
    event_no_description: "مفيش وصف للإيفنت ده.",
  },
};

interface LanguageContextValue {
  language: Language;
  t: (key: TranslationKey) => string;
  setLanguage: (lang: Language) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined,
);

const STORAGE_KEY = "app_language";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [hydrated, setHydrated] = useState(false);
  const previousLanguageRef = useRef<Language | null>(null);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === "ar") {
          setLanguageState("ar-EG");
        } else if (saved && (saved === "en" || saved === "ar-EG")) {
          setLanguageState(saved as Language);
        } else {
          // Check phone locale FIRST as it's the strongest indicator of user preference
          const locales = Localization.getLocales();
          const firstLocale = locales[0];
          const localeStr = firstLocale?.languageTag || firstLocale?.languageCode || "";
          
          if (localeStr.startsWith("ar")) {
            console.log(`[i18n] Arabic phone language detected (${localeStr}). Setting to ar-EG.`);
            setLanguageState("ar-EG");
          } else {
            // If phone is not Arabic, try IP-based detection for regional defaults (like Egypt)
            console.log("[i18n] Phone language not Arabic. Checking country by IP...");
            try {
              const geo = await getGeoInfoByIP();
              const ipCountry = geo?.country;
              console.log(`[i18n] IP Country: ${ipCountry}`);

              if (ipCountry === "EG") {
                console.log(`[i18n] User detected in Egypt by IP. Defaulting to ar-EG.`);
                setLanguageState("ar-EG");
              } else {
                setLanguageState("en");
              }
            } catch (err) {
              console.warn("[i18n] IP detection failed, falling back to English", err);
              setLanguageState("en");
            }
          }
        }
      } catch (e) {
        console.warn("Failed to load language preference", e);
      } finally {
        setHydrated(true);
      }
    };
    loadLanguage();
  }, []);

  // Apply RTL/LTR layout based on selected language and force app reload on change
  useEffect(() => {
    if (!hydrated) return;

    const shouldUseRTL = language === "ar-EG";
    
    if (I18nManager.isRTL !== shouldUseRTL) {
      I18nManager.allowRTL(shouldUseRTL);
      I18nManager.forceRTL(shouldUseRTL);
    }

    const previousLanguage = previousLanguageRef.current;
    previousLanguageRef.current = language;

    // Reload whenever the language changes to ensure all components refresh correctly (RTL/LTR and translations)
    if (previousLanguage && language !== previousLanguage) {
        console.log(`[i18n] Language changed from ${previousLanguage} to ${language}. Forcing reload...`);
        const timer = setTimeout(async () => {
            try {
              console.log("[i18n] Reloading for language/layout change...");
              if (__DEV__) {
                if (typeof DevSettings !== 'undefined' && DevSettings.reload) {
                  DevSettings.reload();
                }
              } else if (Updates && Updates.reloadAsync) {
                await Updates.reloadAsync();
              }
            } catch (e) {
              console.warn("[i18n] Reload failed", e);
            }
          }, 500); // Reduced delay for faster feedback
          return () => clearTimeout(timer);
      }
    
  }, [language, hydrated]);

  const contextValue = React.useMemo(() => {
    const t = (key: TranslationKey): string => {
      const table = translations[language] || translations["en"];
      if (!table) return key;
      const translation = table[key];
      if (!translation) {
        console.warn(`Missing translation for key: ${key}`);
        return translations["en"]?.[key] || key;
      }
      return translation;
    };

    return { 
      language, 
      t, 
      setLanguage: async (lang: Language) => {
        try {
          setLanguageState(lang);
          await AsyncStorage.setItem(STORAGE_KEY, lang);
        } catch (e) {
          console.warn("Failed to persist language preference", e);
        }
      } 
    };
  }, [language]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}

/**
 * Static translation helper for use outside of React components
 */
export async function getStaticT() {
  const saved = await AsyncStorage.getItem("app_language");
  const lang: Language = (saved === "ar-EG" || saved === "en" || saved === "ar") ? (saved === "ar" ? "ar-EG" : saved as Language) : "en";
  
  return (key: TranslationKey, replacements?: Record<string, string | number>) => {
    let text = translations[lang][key] || key;
    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };
}
