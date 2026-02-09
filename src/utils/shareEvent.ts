import { Share } from "react-native";

type Event = {
  id: string;
  title: string;
  date: string;
  is_online?: boolean;
  location?: string | null;
};

export const shareEvent = async (event: Event) => {
  const eventUrl = `https://joino.app/event/${event.id}`;

  const message =
    `I’m going to this 🎟️✨\n` +
    `**${event.title}**\n` +
    `Join me on Joino 📍🔥\n\n` +
    eventUrl;

  try {
    await Share.share({
      message,
      url: eventUrl, // iOS uses this
    });
  } catch (error) {
    console.error("Share failed:", error);
  }
};
