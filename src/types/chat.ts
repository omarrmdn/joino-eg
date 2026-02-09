export type ConversationMessage = {
    id: string;
    text: string;
    time: string;
    timestamp: string;
    fromMe?: boolean;
    link?: string | null;
    type?: string;
    subject?: string | null;
    unread?: boolean;
    eventTitle?: string;
};

export type Conversation = {
    id: string;
    name: string;
    role: string;
    lastMessage: string;
    time: string;
    lastTimestamp: string;
    unread?: boolean;
    avatar: string | null;
    otherUserId: string;
    eventId: string;
    messages: ConversationMessage[];
};
