import { useUser } from '@clerk/clerk-expo';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useSupabaseClient } from '../src/lib/supabaseConfig';

// How notifications behave while the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export function usePushNotifications() {
    const { user } = useUser();
    const supabase = useSupabaseClient();
    const notificationListener = useRef<Notifications.EventSubscription | null>(null);
    const responseListener = useRef<Notifications.EventSubscription | null>(null);

    // ── Register & save token to Supabase ─────────────────────────────────────────

    async function registerForPushNotifications(userId: string) {
        console.log('🔔 registerForPushNotifications called');

        if (!Device.isDevice) {
            console.log('❌ Not a physical device');
            return;
        }

        console.log('👤 User (Clerk):', userId);

        // Android: create notification channel
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'Default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        // Request permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            console.warn('Push notification permission denied');
            return;
        }

        // Get Expo push token
        const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: '58b49d48-07b3-405c-9c37-7074bd897968', // Hardcoded from app.json for reliability
        });
        const token = tokenData.data;

        const deviceName = Device.deviceName ?? Device.modelName ?? 'Unknown Device';

        const { error } = await supabase
            .from('expo_push_tokens')
            .upsert(
                {
                    user_id: userId,
                    token,
                    device_name: deviceName,
                    last_used: new Date().toISOString(),
                },
                { onConflict: 'token' } // token column has UNIQUE constraint ✓
            );

        if (error) {
            console.error('Failed to save push token:', error);
        } else {
            console.log('✅ Push token registered:', token);
        }
    }

    useEffect(() => {
        if (!user) return;

        registerForPushNotifications(user.id);

        // Fired when a notification is received while app is foregrounded
        notificationListener.current = Notifications.addNotificationReceivedListener(
            (notification) => {
                console.log('🔔 Notification received:', notification);
            }
        );

        // Fired when user taps a notification
        responseListener.current = Notifications.addNotificationResponseReceivedListener(
            (response) => {
                const data = response.notification.request.content.data;
                handleNotificationTap(data);
            }
        );

        return () => {
            notificationListener.current?.remove();
            responseListener.current?.remove();
        };
    }, [user, supabase]);
}

// ── Handle notification tap → navigate ───────────────────────────────────────

function handleNotificationTap(data: Record<string, unknown>) {
    const { type, event_id, message_id, question_id } = data as {
        type?: string;
        event_id?: string;
        message_id?: string;
        question_id?: string;
    };

    switch (type) {
        case 'new_attendee':
        case 'attendee_cancel':
        case 'event_access':
        case 'new_event':
            if (event_id) {
                router.push({ pathname: '/event-details', params: { id: event_id } });
            }
            break;

        case 'question':
            if (question_id && event_id) {
                router.push({ pathname: '/event-details', params: { id: event_id } });
            }
            break;

        default:
            if (message_id) {
                router.push({ pathname: '/messages', params: { id: message_id } });
            }
            break;
    }
}

// ── Cleanup: call when user logs out ──────────────────────────────────────────

export async function unregisterPushToken(supabase: any) {
    try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: '58b49d48-07b3-405c-9c37-7074bd897968',
        }).catch(() => null);

        if (!tokenData) return;

        await supabase
            .from('expo_push_tokens')
            .delete()
            .eq('token', tokenData.data);
    } catch (err) {
        console.error('Error unregistering push token:', err);
    }
}
