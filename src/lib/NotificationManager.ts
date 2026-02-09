type Listener = (value: boolean) => void;

class NotificationManager {
    private hasUnreadEvents = false;
    private hasUnreadNotifications = false;
    private hasUnreadMessages = false;
    private eventListeners: Set<Listener> = new Set();
    private notificationListeners: Set<Listener> = new Set();
    private messageListeners: Set<Listener> = new Set();

    getHasUnreadEvents() {
        return this.hasUnreadEvents;
    }

    getHasUnreadNotifications() {
        return this.hasUnreadNotifications;
    }

    getHasUnreadMessages() {
        return this.hasUnreadMessages;
    }

    setHasUnreadEvents(value: boolean) {
        this.hasUnreadEvents = value;
        this.eventListeners.forEach(l => l(value));
    }

    setHasUnreadNotifications(value: boolean) {
        this.hasUnreadNotifications = value;
        this.notificationListeners.forEach(l => l(value));
    }

    setHasUnreadMessages(value: boolean) {
        this.hasUnreadMessages = value;
        this.messageListeners.forEach(l => l(value));
    }

    subscribeEvents(listener: Listener) {
        this.eventListeners.add(listener);
        return () => this.eventListeners.delete(listener);
    }

    subscribeNotifications(listener: Listener) {
        this.notificationListeners.add(listener);
        return () => this.notificationListeners.delete(listener);
    }

    subscribeMessages(listener: Listener) {
        this.messageListeners.add(listener);
        return () => this.messageListeners.delete(listener);
    }
}

export const notificationManager = new NotificationManager();
