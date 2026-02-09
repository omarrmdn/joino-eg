import { useEffect, useState } from 'react';
import { notificationManager } from '../lib/NotificationManager';

export function useNotifications() {
    const [hasUnreadEvents, setHasUnreadEvents] = useState(notificationManager.getHasUnreadEvents());
    const [hasUnreadNotifications, setHasUnreadNotifications] = useState(notificationManager.getHasUnreadNotifications());
    const [hasUnreadMessages, setHasUnreadMessages] = useState(notificationManager.getHasUnreadMessages());

    useEffect(() => {
        const unsubscribeEvents = notificationManager.subscribeEvents(setHasUnreadEvents);
        const unsubscribeNotifications = notificationManager.subscribeNotifications(setHasUnreadNotifications);
        const unsubscribeMessages = notificationManager.subscribeMessages(setHasUnreadMessages);

        return () => {
            unsubscribeEvents();
            unsubscribeNotifications();
            unsubscribeMessages();
        };
    }, []);

    return {
        hasUnreadEvents,
        hasUnreadNotifications,
        hasUnreadMessages,
        setHasUnreadEvents: (val: boolean) => notificationManager.setHasUnreadEvents(val),
        setHasUnreadNotifications: (val: boolean) => notificationManager.setHasUnreadNotifications(val),
        setHasUnreadMessages: (val: boolean) => notificationManager.setHasUnreadMessages(val),
    };
}
