import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Updates from "expo-updates";
import React, {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from "react";
import { I18nManager } from "react-native";

type Language = "en" | "ar";

export type TranslationKey =
  | "tab_home"
  | "tab_my_events"
  | "tab_messages"
  | "tab_you"
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
  | "settings_language_ar"
  | "messages_title"
  | "messages_empty_title"
  | "messages_empty_body"
  | "profile_account"
  | "profile_settings"
  | "profile_support"
  | "profile_total_spend"
  | "profile_total_revenue"
  | "profile_ad_center"
  | "profile_interests"
  | "profile_edit"
  | "profile_done"
  | "profile_no_interests"
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
  | "notification_event_canceled_title"
  | "notification_event_canceled_body"
  | "event_cancel_success"
  | "event_cancel_attendance_confirm_message"
  | "today";

type Translations = Record<Language, Record<TranslationKey, string>>;

export const translations: Translations = {
  en: {
    tab_home: "Home",
    tab_my_events: "My Events",
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
    create_event_banner_hint: "Add Banner (Optional)",
    create_event_title_placeholder: "Event Title *",
    create_event_description_placeholder: "Description (Optional)",
    create_event_type_label: "Event Type *",
    create_event_online: "Online",
    create_event_onsite: "Onsite",
    create_event_location_online: "Event Meeting Link *",
    create_event_location_onsite: "Physical Location *",
    create_event_schedule_label: "Schedule *",
    create_event_start_date: "Start Date *",
    create_event_end_date: "End Date",
    create_event_time: "Time *",
    create_event_end_time: "End Time",
    create_event_end_label: "End Schedule",
    create_event_capacity: "Capacity",
    create_event_cost: "Cost",
    create_event_tags_label: "Tags",
    create_event_tags_placeholder: "Search or add tags...",
    create_event_gender_label: "Target Gender *",
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
    settings_language_ar: "Arabic",
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
    profile_total_spend: "Total Spend",
    profile_total_revenue: "Total Revenue",
    profile_ad_center: "Ad Center",
    profile_interests: "My Interests",
    profile_edit: "Edit",
    profile_done: "Done",
    profile_no_interests: "No interests added yet. Tap Edit to add some!",
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
    onboarding_title: "Joino",
    onboarding_subtitle: "Discover and join the best events happening around you.",
    onboarding_google_button: "Continue with Google",
    onboarding_terms: "By continuing, you agree to our Terms of Service and Privacy Policy.",
    search_results_title: "Search Results",
    search_empty_results: "No results found for",
    search_placeholder: "Running Race",
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
    profile_follow_us: "Follow Us On",
    event_canceled: "Canceled",
    event_ended: "Ended",
    event_cancellation_reason: "Cancellation Reason",
    event_cancel_event: "Cancel Event",
    event_cancel_event_confirm_title: "Cancel Event",
    event_cancel_event_confirm_message: "Are you sure you want to cancel this event? This will notify all attendees.",
    event_cancellation_reason_placeholder: "Enter reason for cancellation...",
    error_event_canceled: "This event has been canceled.",
    error_event_ended: "This event has already ended.",
    notification_event_canceled_title: "Event Canceled",
    notification_event_canceled_body: "The event \"{title}\" has been canceled. Reason: {reason}",
    event_cancel_success: "Event canceled successfully.",
    today: "Today",
    event_cancel_attendance_confirm_message: "Are you sure you want to cancel your attendance? This will notify the organizer.",
  },
  ar: {
    tab_home: "الرئيسية",
    tab_my_events: "فعالياتي",
    tab_messages: "الرسائل",
    tab_you: "حسابي",
    events_my_events_title: "فعالياتي",
    events_empty: "لم تقُم بتنظيم أي فعاليات بعد.",
    event_details_title: "تفاصيل الفعالية",
    event_about: "عن الفعالية",
    event_tags: "الوسوم",
    event_questions: "الأسئلة",
    event_questions_header: "الأسئلة والأجوبة",
    event_questions_empty: "لا توجد أسئلة بعد. كن أول من يطرح سؤالاً!",
    event_attending: "مشاركاً",
    event_question_placeholder: "اسأل سؤالاً عن هذه الفعالية",
    event_send_question: "إرسال السؤال",
    event_sending_question: "جارٍ الإرسال...",
    event_join: "انضمام",
    event_joining: "جارٍ الانضمام...",
    event_attending_status: "مشارك بالقائمة",
    event_cancel_attendance: "إلغاء الحضور",
    event_cancelling_attendance: "جارٍ الإلغاء...",
    rating_title: "قيّم هذه الفعالية",
    rating_title_generic: "قيّم هذه الفعالية",
    rating_subtitle: "كيف كانت تجربتك؟",
    rating_placeholder: "أضف تعليقًا اختياريًا",
    rating_submit: "إرسال التقييم",
    rating_submitting: "جارٍ الإرسال...",
    rating_skip: "لاحقًا",
    rating_thanks_title: "شكرًا لك!",
    rating_thanks_message: "تم إرسال تقييمك.",
    rating_error: "تعذر إرسال التقييم",
    event_edit: "تعديل الفعالية",
    create_event_title: "إنشاء فعالية",
    edit_event_title: "تعديل الفعالية",
    create_event_banner_hint: "إضافة صورة (اختياري)",
    create_event_title_placeholder: "عنوان الفعالية *",
    create_event_description_placeholder: "الوصف (اختياري)",
    create_event_type_label: "نوع الفعالية *",
    create_event_online: "أونلاين",
    create_event_onsite: "حضورياً",
    create_event_location_online: "رابط الاجتماع *",
    create_event_location_onsite: "الموقع *",
    create_event_schedule_label: "الجدول الزمني *",
    create_event_start_date: "تاريخ البدء *",
    create_event_end_date: "تاريخ الانتهاء",
    create_event_time: "الوقت *",
    create_event_end_time: "وقت الانتهاء",
    create_event_end_label: "الجدول الزمني للانتهاء",
    create_event_capacity: "السعة",
    create_event_cost: "التكلفة",
    create_event_tags_label: "الوسوم",
    create_event_tags_placeholder: "ابحث أو أضف وسماً...",
    create_event_gender_label: "الجنس المستهدف *",
    create_event_gender_all: "الكل",
    create_event_gender_males: "ذكور",
    create_event_gender_females: "إناث",
    create_event_gender_male: "ذكور",
    create_event_gender_female: "إناث",
    create_event_publishing: "جارٍ النشر...",
    create_event_publish: "نشر",
    create_event_saving: "جارٍ الحفظ...",
    create_event_save_changes: "حفظ التعديلات",
    notifications_title: "الإشعارات",
    notifications_loading: "جاري تحميل الإشعارات...",
    notifications_empty: "لا توجد إشعارات بعد",
    notifications_type_new_attendee: "مشترك جديد",
    notifications_type_attendee_cancel: "إلغاء اشتراك",
    notifications_type_event_reminders: "تذكير بالفعاليات",
    notifications_type_questions: "أسئلة جديدة",
    notifications_type_new_events_nearby: "فعاليات جديدة بالجوار",
    notifications_type_event_stats: "إحصائيات الفعاليات",
    notifications_type_push_enabled: "تفعيل الإشعارات",
    notifications_save: "حفظ التفضيلات",
    notifications_saving: "جارٍ الحفظ...",
    notifications_save_error: "فشل حفظ التفضيلات.",
    location_near_me: "بالقرب مني",
    settings_title: "الإعدادات",
    settings_language: "اللغة",
    settings_language_description: "اختر لغة التطبيق المفضلة لديك.",
    settings_language_en: "الإنجليزية",
    settings_language_ar: "العربية",
    settings_sign_out: "تسجيل الخروج",
    settings_sign_out_confirm_title: "تسجيل الخروج",
    settings_sign_out_confirm_message: "هل أنت متأكد أنك تريد تسجيل الخروج؟",
    settings_sign_out_cancel: "إلغاء",
    settings_sign_out_confirm: "خروج",
    messages_title: "الرسائل",
    messages_empty_title: "لا توجد رسائل بعد.",
    messages_empty_body: "ستظهر هنا محادثاتك مع المنظمين والمشاركين.",
    profile_account: "الحساب",
    profile_settings: "الإعدادات",
    profile_support: "الدعم",
    profile_total_spend: "إجمالي المصروف",
    profile_total_revenue: "إجمالي الإيراد",
    profile_ad_center: "مركز الإعلانات",
    profile_interests: "اهمتاماتي",
    profile_edit: "تعديل",
    profile_done: "تم",
    profile_no_interests: "لم تضف أي اهتمامات بعد. اضغط على تعديل لإضافة بعض منها!",
    error_generic: "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
    error_required_fields: "يرجى تعبئة جميع الحقول المطلوبة (*) بما في ذلك التاريخ والوقت.",
    error_location_required_onsite: "يرجى إدخال موقع للفعاليات الحضورية.",
    error_link_required_online: "يرجى إدخال رابط للفعاليات الأونلاين.",
    error_invalid_online_link: "يرجى إدخال رابط صحيح للفعالية الأونلاين (يبدأ بـ http:// أو https:// وبدون مسافات).",
    error_login_required: "يجب تسجيل الدخول للمتابعة.",
    error_past_date_title: "تاريخ غير صالح",
    error_past_date_message: "لا يمكنك اختيار تاريخ قد مضى بالفعل.",
    error_permission_photos: "نحتاج صلاحية الوصول إلى الصور حتى تتمكن من رفع صورة للفعالية.",
    event_question_empty_error: "يرجى إدخال سؤال.",
    event_question_submitted_title: "تم بنجاح",
    event_question_submitted: "تم إرسال سؤالك بنجاح.",
    event_question_submit_error: "فشل إرسال السؤال.",
    error_capacity_price_invalid: "يرجى إدخال سعة وتكلفة منطقية (وليست رقم هاتف).",
    error_location_google_required: "يرجى اختيار الموقع من الاقتراحات حتى نتمكن من تحديده على الخريطة.",
    error_notification_preference: "فشل تحميل تفضيلات الإشعارات.",
    location_permission_msg: "مطلوب إذن الموقع للعثور على أقرب الفعاليات",
    location_error_msg: "تعذر الحصول على موقعك",
    location_retry_title: "افتح الموقع للعثور على الفعاليات القريبة",
    location_settings_title: "الإذن مطلوب",
    location_settings_msg: "يرجى تفعيل الوصول للموقع في الإعدادات للعثور على الفعاليات القريبة.",
    btn_no_thanks: "لا شكراً",
    btn_ok: "موافق",
    btn_cancel: "إلغاء",
    btn_open_settings: "فتح الإعدادات",
    event_by: "بواسطة",
    event_description: "الوصف",
    event_gender: "الجنس",
    event_gender_male: "ذكور",
    event_gender_female: "إناث",
    event_gender_all: "الكل",
    event_no_questions: "لا توجد أسئلة بعد. كن أول من يطرح سؤالاً!",
    event_answer: "الإجابة",
    event_answer_placeholder: "اكتب إجابتك...",
    event_no_answer_yet: "لا توجد إجابة بعد",
    event_not_found: "الفعالية غير موجودة",
    create_event_delete: "حذف الفعالية",
    create_event_delete_confirm_title: "حذف الفعالية",
    create_event_delete_confirm_message: "هل أنت متأكد من حذف هذه الفعالية؟ لا يمكن التراجع عن هذا الإجراء.",
    create_event_promote: "روج لفعاليتك",
    promotion_price_title: "السعر",
    promotion_fill_seats: "ملء جميع المقاعد",
    promotion_compliance_note: "إذا لم نقم بملء جميع المقاعد، فستحصل على تعويض",
    promotion_continue: "المتابعة للشراء",
    home_featured_popular: "مشتركة في",
    home_featured_interested: "لأنك مهتم بـ",
    home_featured_suggested: "مقترح لك",
    onboarding_title: "جوينو",
    onboarding_subtitle: "اكتشف وانضم إلى أفضل الفعاليات التي تحدث من حولك.",
    onboarding_google_button: "المتابعة باستخدام جوجل",
    onboarding_terms: "بالاستمرار، فإنك توافق على شروط الخدمة وسياسة الخصوصية الخاصة بنا.",
    search_results_title: "نتائج البحث",
    search_empty_results: "لم يتم العثور على نتائج لـ",
    search_placeholder: "سباق الجري",
    btn_yes_cancel: "نعم، إلغاء",
    promote_modal_title: "روج لفعاليتك\nواملأ كل المقاعد.",
    promote_modal_subtitle: "صل إلى الجمهور المناسب، وزد من التفاعل، واجعل فعاليتك لا تُنسى.",
    promote_modal_boost_button: "ترويج مقابل ٥٠ ج.م",
    promote_modal_secondary_action: "أو اختر ميزانيتك",
    home_nearby: "فعاليات قريبة منك",
    home_trending: "رائج الآن",
    home_no_events: "لا توجد فعاليات",
    home_no_events_tag: "لا توجد فعاليات بالوسم",
    error_title: "خطأ",
    settings_reload_note: "قد تحتاج بعض الشاشات إلى إعادة الفتح حتى يتم تحديث اللغة بالكامل.",
    profile_update_failed: "فشل التحديث",
    profile_update_failed_msg: "عذرًا، لم نتمكن من حفظ اهتماماتك. يرجى المحاولة مرة أخرى.",
    profile_name_empty: "لا يمكن أن يكون الاسم فارغاً",
    profile_update_profile_failed: "فشل تحديث الملف الشخصي",
    profile_permission_photos: "تم رفض الإذن",
    profile_permission_photos_msg: "نحتاج إلى الوصول إلى صورك لتغيير صورتك الشخصية.",
    profile_file_too_large: "الملف كبير جداً",
    profile_file_too_large_msg: "يرجى اختيار صورة أصغر من ٥ ميجابايت.",
    profile_update_success: "نجاح",
    profile_update_success_msg: "تم تحديث الصورة الشخصية بنجاح",
    profile_update_image_failed: "فشل تحديث صورة الملف الشخصي",
    profile_load_failed: "فشل تحميل بيانات المستخدم",
    profile_name_placeholder: "اسمك",
    profile_user_name_fallback: "اسم المستخدم",
    create_event_repeat_weekly: "تكرار أسبوعي",
    create_event_repeat_helper_prefix: "ستتكرر هذه الفعالية كل",
    create_event_repeat_helper_until: "حتى",
    create_event_repeat_helper_no_end: "بدون تاريخ انتهاء",
    create_event_edit_login_required: "يجب تسجيل الدخول لتعديل الفعالية",
    create_event_edit_not_allowed: "غير مسموح",
    create_event_edit_not_allowed_msg: "يمكنك فقط تعديل الفعاليات التي نظمتها.",
    create_event_repeat_note_prefix: "تتكرر هذه الفعالية كل",
    chat_organizer_of: "منظم لـ",
    chat_type_message: "اكتب رسالة...",
    chat_yesterday: "أمس",
    chat_unknown_user: "مستخدم غير معروف",
    chat_general_role: "عام",
    event_only: "فقط",
    notification_new_attendee_title: "مشترك جديد!",
    notification_new_attendee_body: "انضم {name} إلى فعاليتك \"{title}\"",
    notification_event_access_online_title: "رابط الفعالية أونلاين",
    notification_event_access_onsite_title: "تفاصيل موقع الفعالية",
    notification_event_access_online_body: "انضم إلى الفعالية \"{title}\" باستخدام هذا الرابط: {link}",
    notification_event_access_onsite_body: "إليك موقع الفعالية \"{title}\": {location}",
    notification_cancellation_title: "إلغاء حضور",
    notification_cancellation_body: "ألغى {name} حضوره لفعالية \"{title}\"",
    notification_reminder_title: "تذكير بالفعالية!",
    notification_reminder_body: "ستبدأ \"{title}\" خلال {hours} ساعات",
    notification_question_title: "سؤال جديد",
    notification_question_body: "طرح {name} سؤالاً حول \"{title}\"",
    notification_answer_title: "تمت الإجابة على السؤال",
    notification_answer_body: "أجاب {name} على سؤالك حول \"{title}\"",
    notification_nearby_title: "فعالية قريبة منك!",
    notification_nearby_body: "تقام \"{title}\" على بعد {distance} كم منك",
    profile_follow_us: "تابعنا على",
    event_canceled: "ملغاة",
    event_ended: "منتهية",
    event_cancellation_reason: "سبب الإلغاء",
    event_cancel_event: "إلغاء الفعالية",
    event_cancel_event_confirm_title: "إلغاء الفعالية",
    event_cancel_event_confirm_message: "هل أنت متأكد من إلغاء هذه الفعالية؟ سيتم إخطار جميع المشاركين.",
    event_cancellation_reason_placeholder: "أدخل سبب الإلغاء...",
    error_event_canceled: "تم إلغاء هذه الفعالية.",
    error_event_ended: "لقد انتهت هذه الفعالية بالفعل.",
    notification_event_canceled_title: "تم إلغاء الفعالية",
    notification_event_canceled_body: "تم إلغاء الفعالية \"{title}\". السبب: {reason}",
    event_cancel_success: "تم إلغاء الفعالية بنجاح.",
    today: "اليوم",
    event_cancel_attendance_confirm_message: "هل أنت متأكد من رغبتك في إلغاء حضورك؟ سيتم إخطار المنظم بذلك.",
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

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === "en" || saved === "ar") {
          setLanguageState(saved);
        }
      } catch (e) {
        console.warn("Failed to load language preference", e);
      } finally {
        setHydrated(true);
      }
    };
    loadLanguage();
  }, []);

  // Apply RTL/LTR layout based on selected language
  useEffect(() => {
    if (!hydrated) return;

    const shouldUseRTL = language === "ar";

    if (I18nManager.isRTL !== shouldUseRTL) {
      console.log(`[i18n] Language changed to ${language}. RTL mismatch. Forcing reload...`);
      
      // Update I18nManager
      I18nManager.allowRTL(shouldUseRTL);
      I18nManager.forceRTL(shouldUseRTL);

      // We use a small flag to prevent immediate re-triggering if the reload is delayed
      const timer = setTimeout(async () => {
        try {
          if (Updates.reloadAsync) {
            await Updates.reloadAsync();
          } else {
            console.warn("[i18n] Updates.reloadAsync is not available");
          }
        } catch (e) {
          console.warn("[i18n] Failed to reload app after RTL change", e);
        }
      }, 500); // 500ms delay to let things settle

      return () => clearTimeout(timer);
    }
  }, [language, hydrated]);

  const contextValue = React.useMemo(() => {
    const t = (key: TranslationKey): string => {
      const table = translations[language];
      const translation = table[key];
      if (!translation) {
        console.warn(`Missing translation for key: ${key}`);
        return key;
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
  const lang: Language = (saved === "ar" || saved === "en") ? saved : "en";
  
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
