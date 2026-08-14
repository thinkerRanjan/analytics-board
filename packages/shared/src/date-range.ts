import {
  format,
  subDays,
  startOfDay,
  endOfDay,
  parseISO,
  isValid,
} from "date-fns";

export type DateRangePreset = "7d" | "28d" | "90d" | "custom";

export type DateRange = {
  start: string;
  end: string;
  preset: DateRangePreset;
};

export function toDateString(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function presetToRange(
  preset: Exclude<DateRangePreset, "custom">,
): DateRange {
  const end = startOfDay(new Date());
  const days = preset === "7d" ? 6 : preset === "28d" ? 27 : 89;
  const start = startOfDay(subDays(end, days));
  return {
    start: toDateString(start),
    end: toDateString(end),
    preset,
  };
}

export function parseDateRange(
  start?: string | null,
  end?: string | null,
  preset?: string | null,
): DateRange {
  if (preset === "7d" || preset === "28d" || preset === "90d") {
    return presetToRange(preset);
  }

  if (start && end) {
    const startDate = parseISO(start);
    const endDate = parseISO(end);
    if (isValid(startDate) && isValid(endDate) && startDate <= endDate) {
      return {
        start: toDateString(startOfDay(startDate)),
        end: toDateString(endOfDay(endDate)),
        preset: "custom",
      };
    }
  }

  return presetToRange("28d");
}
