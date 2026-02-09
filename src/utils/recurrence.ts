export type RecurrencePattern = "daily" | "weekly" | "biweekly" | "monthly" | "custom" | null | undefined;

const getWeekdayName = (dayIndex: number, language: string) => {
  const base = new Date(2023, 0, 1 + dayIndex);
  return new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en-US", {
    weekday: "long",
  }).format(base);
};

export const getRecurringLabel = (
  isRecurring: boolean | undefined,
  recurrencePattern: RecurrencePattern,
  recurrenceDays: number[] | null | undefined,
  language: string,
) => {
  if (!isRecurring || !recurrencePattern) return null;

  if (recurrencePattern === "daily") {
    return language === "ar" ? "يوميًا" : "Daily";
  }

  if (recurrencePattern === "monthly") {
    return language === "ar" ? "شهريًا" : "Monthly";
  }

  if ((recurrencePattern === "weekly" || recurrencePattern === "biweekly") && recurrenceDays?.length) {
    const names = recurrenceDays.map((day) => getWeekdayName(day, language));
    if (language === "en") {
      return names.map((name) => (name.endsWith("s") ? name : `${name}s`)).join(", ");
    }
    return names.join("، ");
  }

  return null;
};
