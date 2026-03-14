const RECURRING_STATES = new Set(["daily", "weekly", "monthly", "yearly"] as const);

export const CALENDARS = ["russell", "family"] as const;
export const RECURRENCES = ["daily", "weekly", "monthly", "yearly"] as const;
export const DEFAULT_TIMEZONE = process.env.CALENDAR_TIMEZONE ?? "America/Boise";

export type CalendarName = (typeof CALENDARS)[number];
export type Recurrence = (typeof RECURRENCES)[number];
export type CalendarState = "none" | "once" | Recurrence;

export interface CalendarThoughtInput {
  calendar: CalendarName;
  title: string;
  start: string;
  duration: string;
  notes?: string;
  recurrence?: Recurrence;
}

export function buildCalendarThoughtText(input: CalendarThoughtInput): string {
  const lines = [
    "---",
    "type: calendar-event",
    `calendar: ${input.calendar}`,
    `title: ${input.title}`,
    `start: ${input.start}`,
    `duration: ${input.duration}`,
  ];

  if (input.recurrence) {
    lines.push(`recurrence: ${input.recurrence}`);
  }

  lines.push("---");

  const notes = input.notes?.trim();
  if (notes) {
    lines.push(notes);
  }

  return `${lines.join("\n")}\n`;
}

export function inferCalendarState(input: Pick<CalendarThoughtInput, "recurrence">): CalendarState {
  if (!input.recurrence) {
    return "once";
  }

  return RECURRING_STATES.has(input.recurrence) ? input.recurrence : "none";
}

export function inferCalendarDate(input: Pick<CalendarThoughtInput, "start" | "recurrence">, timeZone = DEFAULT_TIMEZONE): string | null {
  if (inferCalendarState(input) !== "once") {
    return null;
  }

  const normalizedStart = normalizeTimeZoneDateTime(input.start, timeZone);
  return localDateString(normalizedStart, timeZone);
}

export function normalizeTimeZoneDateTime(value: string, timeZone = DEFAULT_TIMEZONE): string {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    throw new Error("Datetime is required.");
  }

  if (/(?:[zZ]|[+-]\d{2}:\d{2})$/.test(trimmed)) {
    const direct = new Date(trimmed);
    if (Number.isNaN(direct.getTime())) {
      throw new Error(`Invalid ISO datetime: ${value}`);
    }

    return trimmed;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
  if (!match) {
    throw new Error(`Invalid local datetime: ${value}`);
  }

  const [, year, month, day, hour, minute, second = "00"] = match;
  const utcGuess = Date.UTC(
    Number.parseInt(year, 10),
    Number.parseInt(month, 10) - 1,
    Number.parseInt(day, 10),
    Number.parseInt(hour, 10),
    Number.parseInt(minute, 10),
    Number.parseInt(second, 10)
  );

  let candidate = utcGuess - timeZoneOffsetMinutes(new Date(utcGuess), timeZone) * 60_000;
  const refinedOffset = timeZoneOffsetMinutes(new Date(candidate), timeZone);
  candidate = utcGuess - refinedOffset * 60_000;

  return `${year}-${month}-${day}T${hour}:${minute}:${second}${offsetLabel(refinedOffset)}`;
}

export function localDateString(iso: string, timeZone = DEFAULT_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error(`Unable to format local date for ${iso}`);
  }

  return `${year}-${month}-${day}`;
}

export function parseDurationToMinutes(value: string): number {
  const trimmed = value.trim().toLowerCase();
  const match = /^(\d+)(m|h)$/.exec(trimmed);

  if (!match) {
    throw new Error(`Invalid duration: ${value}`);
  }

  const amount = Number.parseInt(match[1], 10);
  return match[2] === "h" ? amount * 60 : amount;
}

function timeZoneOffsetMinutes(date: Date, timeZone = DEFAULT_TIMEZONE): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    hour: "2-digit",
  }).formatToParts(date);

  const label = parts.find((part) => part.type === "timeZoneName")?.value;
  const match = /^GMT(?:(\+|-)(\d{1,2})(?::?(\d{2}))?)?$/.exec(label ?? "");
  if (!match) {
    throw new Error(`Unable to determine timezone offset for ${timeZone}`);
  }

  if (!match[1]) {
    return 0;
  }

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number.parseInt(match[2] ?? "0", 10);
  const minutes = Number.parseInt(match[3] ?? "0", 10);
  return sign * (hours * 60 + minutes);
}

function offsetLabel(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absolute = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, "0");
  const minutes = String(absolute % 60).padStart(2, "0");
  return `${sign}${hours}:${minutes}`;
}
