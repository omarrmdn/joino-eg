
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
