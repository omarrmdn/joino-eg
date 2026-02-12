
export const parseUTCDate = (dateString: string) => {
    if (!dateString) return new Date();
    let str = dateString;
    if (str.includes(' ') && !str.includes('T')) {
        str = str.replace(' ', 'T');
    }
    if (!str.includes('Z') && !str.includes('+') && !/-\d{2}:?\d{2}$/.test(str)) {
        str += 'Z';
    }
    return new Date(str);
};

export const formatTimeForBubble = (dateString: string, locale: string = 'en') => {
    const date = parseUTCDate(dateString);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = locale === 'ar'
        ? (hours >= 12 ? 'م' : 'ص')
        : (hours >= 12 ? 'PM' : 'AM');

    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;

    return `${displayHours}:${displayMinutes} ${ampm}`;
};

const isDateInCurrentWeek = (date: Date, now: Date = new Date()) => {
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    const dayOfWeek = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    return target >= startOfWeek && target <= endOfWeek;
};

export const formatEventDateLabel = (dateString: string, language: string = 'en') => {
    if (!dateString) return '';
    const date = parseUTCDate(dateString);
    if (Number.isNaN(date.getTime())) return '';

    const isArabic = language.startsWith('ar');
    const locale = isArabic ? 'ar-EG' : 'en-US';
    const inCurrentWeek = isDateInCurrentWeek(date);

    if (inCurrentWeek) {
        return date.toLocaleDateString(locale, { weekday: 'long' });
    }

    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
};

export const formatEventTime = (timeString: string, language: string = 'en') => {
    if (!timeString) return '';

    // Handle "HH:mm:ss" or "HH:mm"
    const [h, m] = timeString.split(':');
    let hours = parseInt(h, 10);
    const minutes = parseInt(m, 10);

    if (isNaN(hours) || isNaN(minutes)) return timeString;

    const isArabic = language.startsWith('ar');
    const ampm = hours >= 12
        ? (isArabic ? 'م' : 'PM')
        : (isArabic ? 'ص' : 'AM');

    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'

    const minutesFormatted = minutes < 10 ? `0${minutes}` : minutes;

    return `${hours}:${minutesFormatted} ${ampm}`;
};
