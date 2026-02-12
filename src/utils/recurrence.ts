export type RecurrencePattern = "daily" | "weekly" | "biweekly" | "monthly" | "custom" | null | undefined;

const getWeekdayName = (dayIndex: number, language: string) => {
  const base = new Date(2023, 0, 1 + dayIndex);
  return new Intl.DateTimeFormat(language.startsWith("ar") ? "ar-EG" : "en-US", {
    weekday: "long",
  }).format(base);
};

export const getRecurringLabel = (
  isRecurring: boolean | undefined,
  recurrencePattern: RecurrencePattern,
  recurrenceDays: number[] | null | undefined,
  language: string,
  t?: (key: any) => string,
  fullSentence: boolean = false,
) => {
  if (!isRecurring || !recurrencePattern) return null;

  const prefix = fullSentence ? (t ? t("create_event_repeat_note_prefix") : (language.startsWith("ar") ? "تتكرر هذه الفعالية كل" : "This event repeats every")) : "";

  if (recurrencePattern === "daily") {
    const label = t ? t("recurrence_daily") : (language.startsWith("ar") ? "يوميًا" : "Daily");
    if (fullSentence) {
      return language.startsWith("ar") ? (t ? t("create_event_repeat_note_prefix").replace(" كل", "") : "تتكرر هذه الفعالية") + " " + label : `This event repeats ${label.toLowerCase()}`;
    }
    return label;
  }

  if (recurrencePattern === "monthly") {
    const label = t ? t("recurrence_monthly") : (language.startsWith("ar") ? "شهريًا" : "Monthly");
    if (fullSentence) {
      return language.startsWith("ar") ? (t ? t("create_event_repeat_note_prefix").replace(" كل", "") : "تتكرر هذه الفعالية") + " " + label : `This event repeats ${label.toLowerCase()}`;
    }
    return label;
  }

  if ((recurrencePattern === "weekly" || recurrencePattern === "biweekly") && recurrenceDays?.length) {
    const names = recurrenceDays.map((day) => getWeekdayName(day, language));
    let daysLabel = "";
    if (language === "en") {
      daysLabel = names.map((name) => (name.endsWith("s") ? name : `${name}s`)).join(", ");
    } else {
      daysLabel = names.join("، ");
    }

    if (fullSentence) {
      const every = t ? t("recurrence_every") : (language.startsWith("ar") ? "كل" : "every");
      const patternLabel = recurrencePattern === "biweekly" ? (t ? t("recurrence_biweekly") : "bi-weekly") : "";
      const finalPrefix = t ? t("create_event_repeat_note_prefix") : (language.startsWith("ar") ? "تتكرر هذه الفعالية كل" : "This event repeats every");

      if (recurrencePattern === "biweekly") {
        return language.startsWith("ar")
          ? `${finalPrefix} أسبوعين (${daysLabel})`
          : `${finalPrefix} two weeks on ${daysLabel}`;
      }
      return `${finalPrefix} ${daysLabel}`;
    }

    if (recurrencePattern === "biweekly") {
      const biLabel = t ? t("recurrence_biweekly") : (language.startsWith("ar") ? "كل أسبوعين" : "Bi-weekly");
      return `${biLabel} (${daysLabel})`;
    }

    return daysLabel;
  }

  return null;
};
