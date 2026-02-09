// types/notifications.ts

export type NotificationType =
  | 'new_attendee'
  | 'attendee_cancel'
  | 'reminder_12hr'
  | 'reminder_2hr'
  | 'event_access'
  | 'question'
  | 'new_event'
  | 'event_stats';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, any>;
  read: boolean;
  created_at: string;
  sent_at: string | null;
}

export interface NotificationPreferences {
  user_id: string;
  new_attendee: boolean;
  attendee_cancel: boolean;
  event_reminders: boolean;
  questions: boolean;
  new_events_nearby: boolean;
  event_stats: boolean;
  push_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExpoPushToken {
  id: string;
  user_id: string;
  token: string;
  device_name: string | null;
  created_at: string;
  last_used: string;
}

export interface EventQuestion {
  id: string;
  event_id: string;
  user_id: string;
  organizer_id: string;
  question: string;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
}

export interface PushNotificationData {
  event_id?: string;
  attendee_id?: string;
  question_id?: string;
  event_title?: string;
  event_date?: string;
  event_time?: string;
  location?: string;
  is_online?: boolean;
  views?: number;
  milestone?: number;
  matched_interests?: number;
  cancellation_reason?: string;
}
