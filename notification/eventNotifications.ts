import { SupabaseClient } from '@supabase/supabase-js';
import { getStaticT } from '../src/lib/i18n';
import { createNotification } from './createNotification';
import type { PushNotificationData } from './notifications';

/**
 * Notify event organizer of new attendee
 */
export async function notifyNewAttendee(
  client: SupabaseClient,
  eventId: string,
  organizerId: string,
  attendeeName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get event details
    const { data: event, error: eventError } = await client
      .from('events')
      .select('title')
      .eq('id', eventId)
      .single();

    if (eventError) throw eventError;

    const notificationData: PushNotificationData = {
      event_id: eventId,
      event_title: event.title,
    };

    const t = await getStaticT();
    await createNotification(
      client,
      organizerId,
      'new_attendee',
      t('notification_new_attendee_title'),
      t('notification_new_attendee_body', { name: attendeeName, title: event.title }),
      notificationData
    );

    return { success: true };
  } catch (error: any) {
    console.error('Error notifying new attendee:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Notify attendee with event access details (online link or onsite location)
 * This can be called right after they join, and also from any future
 * payment/deposit success flow for paid events.
 */
export async function notifyAttendeeEventAccessDetails(
  client: SupabaseClient,
  eventId: string,
  attendeeId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: event, error: eventError } = await client
      .from('events')
      .select('title, date, time, location, is_online, link, organizer_id')
      .eq('id', eventId)
      .single();

    if (eventError) throw eventError;

    const notificationData: PushNotificationData = {
      event_id: eventId,
      event_title: event.title,
      event_date: event.date,
      event_time: event.time,
      location: event.location || event.link || undefined,
      is_online: event.is_online,
    };

    const isOnline = !!event.is_online;
    const hasLink = !!event.link;
    const hasLocation = !!event.location;

    const t = await getStaticT();
    const title = isOnline
      ? t('notification_event_access_online_title')
      : t('notification_event_access_onsite_title');

    let body: string;
    if (isOnline) {
      body = hasLink
        ? t('notification_event_access_online_body', { title: event.title, link: event.link })
        : `This is an online event, but the organizer hasn't added a meeting link yet.`;
    } else {
      body = hasLocation
        ? t('notification_event_access_onsite_body', { title: event.title, location: event.location })
        : `This is an onsite event, but the organizer hasn't added a specific location yet.`;
    }

    // Send push notification
    await createNotification(
      client,
      attendeeId,
      'event_access',
      title,
      body,
      notificationData
    );

    // Also send a formal message in the Inbox (persisted in messages table)
    // Only for online events with a link for now, as requested
    // DO NOT send if the attendee IS the organizer (Self-memo)
    if (isOnline && hasLink && event.organizer_id && attendeeId !== event.organizer_id) {
      const { error: messageError } = await client.from('messages').insert({
        event_id: eventId,
        sender_id: event.organizer_id,
        recipient_id: attendeeId,
        message_type: 'event_link',
        subject: isOnline ? t('notification_event_access_online_title') : t('notification_event_access_onsite_title'),
        body: body,
        event_link: event.link,
      });

      if (messageError) {
        console.error('Error sending event link message:', messageError);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error notifying attendee event access details:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Notify event organizer of cancelled attendee
 */
export async function notifyAttendeeCancellation(
  client: SupabaseClient,
  eventId: string,
  organizerId: string,
  attendeeName: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: event, error: eventError } = await client
      .from('events')
      .select('title')
      .eq('id', eventId)
      .single();

    if (eventError) throw eventError;

    const notificationData: PushNotificationData = {
      event_id: eventId,
      event_title: event.title,
      cancellation_reason: reason,
    };

    const t = await getStaticT();
    const body = reason
      ? t('notification_cancellation_body', { name: attendeeName, title: event.title }) + ` Reason: ${reason}`
      : t('notification_cancellation_body', { name: attendeeName, title: event.title });

    await createNotification(
      client,
      organizerId,
      'attendee_cancel',
      t('notification_cancellation_title'),
      body,
      notificationData
    );

    return { success: true };
  } catch (error: any) {
    console.error('Error notifying cancellation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Notify attendee of their own cancellation success
 */
export async function notifyAttendeeCancellationSelf(
  client: SupabaseClient,
  eventId: string,
  attendeeId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: event, error: eventError } = await client
      .from('events')
      .select('title')
      .eq('id', eventId)
      .single();

    if (eventError) throw eventError;

    const t = await getStaticT();
    await createNotification(
      client,
      attendeeId,
      'attendee_cancel',
      t('notification_attendee_cancel_confirmation_title'),
      t('notification_attendee_cancel_confirmation_body', { title: event.title }),
      { event_id: eventId, event_title: event.title }
    );

    return { success: true };
  } catch (error: any) {
    console.error('Error notifying self cancellation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Notify attendees of event reminders
 */
export async function notifyEventReminder(
  client: SupabaseClient,
  eventId: string,
  hoursBeforeEvent: 12 | 2
): Promise<{ success: boolean; notified: number; error?: string }> {
  try {
    // Get event and attendees
    const { data: event, error: eventError } = await client
      .from('events')
      .select('title, date, time')
      .eq('id', eventId)
      .single();

    if (eventError) throw eventError;

    const { data: attendees, error: attendeesError } = await client
      .from('attendees')
      .select('user_id')
      .eq('event_id', eventId);

    if (attendeesError) throw attendeesError;

    const notificationType = hoursBeforeEvent === 12 ? 'reminder_12hr' : 'reminder_2hr';
    const notificationData: PushNotificationData = {
      event_id: eventId,
      event_title: event.title,
      event_date: event.date,
      event_time: event.time,
    };

    const t = await getStaticT();
    // Send reminder to all attendees
    let notified = 0;
    for (const attendee of attendees || []) {
      const result = await createNotification(
        client,
        attendee.user_id,
        notificationType,
        t('notification_reminder_title'),
        t('notification_reminder_body', { title: event.title, hours: hoursBeforeEvent }),
        notificationData
      );
      if (result.success) notified++;
    }

    return { success: true, notified };
  } catch (error: any) {
    console.error('Error sending reminder:', error);
    return { success: false, notified: 0, error: error.message };
  }
}

/**
 * Notify organizer of new question
 */
export async function notifyNewQuestion(
  client: SupabaseClient,
  eventId: string,
  organizerId: string,
  questionId: string,
  askerId: string,
  askerName: string,
  questionText: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: event, error: eventError } = await client
      .from('events')
      .select('title')
      .eq('id', eventId)
      .single();

    if (eventError) throw eventError;

    const notificationData: PushNotificationData = {
      event_id: eventId,
      question_id: questionId,
      event_title: event.title,
    };

    // 1. Persist the question in the inbox as a message
    if (organizerId !== askerId) {
      try {
        const { error: messageError } = await client.from('messages').insert({
          event_id: eventId,
          sender_id: askerId,
          recipient_id: organizerId,
          message_type: 'general',
          subject: event.title,
          body: questionText,
          created_at: new Date().toISOString(),
        });

        if (messageError) {
          console.error('Error sending question message:', messageError);
        }
      } catch (msgErr) {
        console.error('Exception sending question message:', msgErr);
      }
    }

    // 2. Send push notification (best effort)
    try {
      const t = await getStaticT();
      await createNotification(
        client,
        organizerId,
        'question',
        t('notification_question_title'),
        t('notification_question_body', { name: askerName, title: event.title }),
        notificationData
      );
    } catch (notifErr) {
      console.warn('Notification failed but message was sent:', notifErr);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error notifying question:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Notify attendee of question answer
 */
export async function notifyQuestionAnswer(
  client: SupabaseClient,
  eventId: string,
  attendeeId: string,
  organizerName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: event, error: eventError } = await client
      .from('events')
      .select('title, organizer_id')
      .eq('id', eventId)
      .single();

    if (eventError) throw eventError;

    const notificationData: PushNotificationData = {
      event_id: eventId,
      event_title: event.title,
    };

    const t = await getStaticT();

    // 1. Persist the answer in the inbox as a message from organizer
    if (event.organizer_id && event.organizer_id !== attendeeId) {
      try {
        const messageBody = t('notification_answer_body', { name: organizerName, title: event.title });

        const { error: messageError } = await client.from('messages').insert({
          event_id: eventId,
          sender_id: event.organizer_id,
          recipient_id: attendeeId,
          message_type: 'general',
          subject: event.title,
          body: messageBody,
          created_at: new Date().toISOString(),
        });

        if (messageError) {
          console.error('Error sending answer message:', messageError);
        }
      } catch (msgErr) {
        console.error('Exception sending answer message:', msgErr);
      }
    }

    // 2. Send push notification
    try {
      await createNotification(
        client,
        attendeeId,
        'question',
        t('notification_answer_title'),
        t('notification_answer_body', { name: organizerName, title: event.title }),
        notificationData
      );
    } catch (notifErr) {
      console.warn('Notification failed but answer message was sent:', notifErr);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error notifying answer:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Notify user of nearby events matching interests
 */
export async function notifyNearbyEvent(
  client: SupabaseClient,
  userId: string,
  eventId: string,
  eventTitle: string,
  distance: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const notificationData: PushNotificationData = {
      event_id: eventId,
      event_title: eventTitle,
    };

    const t = await getStaticT();
    await createNotification(
      client,
      userId,
      'new_event',
      t('notification_nearby_title'),
      t('notification_nearby_body', { title: eventTitle, distance: distance }),
      notificationData
    );

    return { success: true };
  } catch (error: any) {
    console.error('Error notifying nearby event:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Notify all attendees of event cancellation
 */
export async function notifyEventCancellation(
  client: SupabaseClient,
  eventId: string,
  reason: string
): Promise<{ success: boolean; notified: number; error?: string }> {
  try {
    // Get event title
    const { data: event, error: eventError } = await client
      .from('events')
      .select('title')
      .eq('id', eventId)
      .single();

    if (eventError) throw eventError;

    // Get all attendees
    const { data: attendees, error: attendeesError } = await client
      .from('attendees')
      .select('user_id')
      .eq('event_id', eventId);

    if (attendeesError) throw attendeesError;

    const t = await getStaticT();
    const title = t('notification_event_canceled_title');
    const body = t('notification_event_canceled_body', { title: event.title, reason });

    const notificationData: PushNotificationData = {
      event_id: eventId,
      event_title: event.title,
      cancellation_reason: reason,
    };

    let notified = 0;
    for (const attendee of attendees || []) {
      const result = await createNotification(
        client,
        attendee.user_id,
        'attendee_cancel', // Reusing this type or we could add a new one if schema allows
        title,
        body,
        notificationData
      );
      if (result.success) notified++;
    }

    return { success: true, notified };
  } catch (error: any) {
    console.error('Error notifying event cancellation:', error);
    return { success: false, notified: 0, error: error.message };
  }
}

/**
 * Notify recipient of a new chat message
 */
export async function notifyNewMessage(
  client: SupabaseClient,
  recipientId: string,
  senderName: string,
  messageText: string,
  eventId?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const t = await getStaticT();

    await createNotification(
      client,
      recipientId,
      'question', // Reusing 'question' type as it maps to messages/chats in UX
      t('notification_message_title'),
      t('notification_message_body', { name: senderName, message: messageText }),
      { event_id: eventId || undefined }
    );

    return { success: true };
  } catch (error: any) {
    console.error('Error notifying new message:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Notify user of event recommendations
 */
export async function notifyEventRecommendation(
  client: SupabaseClient,
  userId: string,
  eventId: string,
  eventTitle: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const t = await getStaticT();
    await createNotification(
      client,
      userId,
      'recommendation',
      t('notification_recommendation_title'),
      t('notification_recommendation_body', { title: eventTitle }),
      { event_id: eventId, event_title: eventTitle }
    );
    return { success: true };
  } catch (error: any) {
    console.error('Error notifying recommendation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Notify all attendees when an online event link is updated
 */
export async function notifyEventLinkUpdate(
  client: SupabaseClient,
  eventId: string,
  link: string
): Promise<{ success: boolean; notified: number; error?: string }> {
  try {
    const { data: event, error: eventError } = await client
      .from('events')
      .select('title, organizer_id')
      .eq('id', eventId)
      .single();

    if (eventError) throw eventError;

    const { data: attendees, error: attendeesError } = await client
      .from('attendees')
      .select('user_id')
      .eq('event_id', eventId);

    if (attendeesError) throw attendeesError;

    const t = await getStaticT();
    const title = t('notification_event_update_title');
    const body = t('notification_event_update_body_link', { title: event.title });

    let notified = 0;
    for (const attendee of attendees || []) {
      // Don't notify organizer
      if (attendee.user_id === event.organizer_id) continue;

      // 1. Send push/database notification
      const result = await createNotification(
        client,
        attendee.user_id,
        'event_update',
        title,
        body,
        { event_id: eventId, event_title: event.title, link }
      );

      // 2. Also send as an inbox message if it succeeds
      if (result.success) {
        await client.from('messages').insert({
          event_id: eventId,
          sender_id: event.organizer_id,
          recipient_id: attendee.user_id,
          message_type: 'event_link',
          subject: title,
          body: body,
          event_link: link,
        });
        notified++;
      }
    }

    return { success: true, notified };
  } catch (error: any) {
    console.error('Error notifying event link update:', error);
    return { success: false, notified: 0, error: error.message };
  }
}
