import { create } from 'zustand';

interface NotificationState {
    hasUnreadEvents: boolean;
    hasUnreadNotifications: boolean;
    setHasUnreadEvents: (value: boolean) => void;
    setHasUnreadNotifications: (value: boolean) => void;
    clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
    hasUnreadEvents: false,
    hasUnreadNotifications: false,
    setHasUnreadEvents: (value) => set({ hasUnreadEvents: value }),
    setHasUnreadNotifications: (value) => set({ hasUnreadNotifications: value }),
    clearAll: () => set({ hasUnreadEvents: false, hasUnreadNotifications: false }),
}));
