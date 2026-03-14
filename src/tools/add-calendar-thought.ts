import { z } from "zod";
import { pool } from "../db/client.js";
import {
  buildCalendarThoughtText,
  CALENDARS,
  inferCalendarDate,
  inferCalendarState,
  normalizeTimeZoneDateTime,
  parseDurationToMinutes,
  RECURRENCES,
} from "../lib/calendar.js";
import { embed, vectorToString } from "../lib/embeddings.js";

const schema = {
  calendar: z.enum(CALENDARS).describe("Which calendar this belongs to"),
  title: z.string().min(1).max(200).describe("Event title"),
  start: z.string().min(1).describe("ISO datetime, with or without timezone offset"),
  duration: z.string().min(2).max(20).describe("Duration like 30m or 2h"),
  notes: z.string().max(6000).optional().describe("Optional event notes"),
  recurrence: z.enum(RECURRENCES).optional().describe("Optional recurrence rule"),
};

type Input = z.infer<z.ZodObject<typeof schema>>;

export const addCalendarThoughtTool = {
  name: "add_calendar_thought",
  description:
    "Save a calendar item as a thought with calendar front matter, embedding, and calendar metadata columns.",
  schema,
  handler: async ({ calendar, title, start, duration, notes, recurrence }: Input) => {
    let normalizedStart: string;
    try {
      normalizedStart = normalizeTimeZoneDateTime(start);
      parseDurationToMinutes(duration);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ error: msg }),
          },
        ],
      };
    }

    const text = buildCalendarThoughtText({
      calendar,
      title: title.trim(),
      start: normalizedStart,
      duration: duration.trim().toLowerCase(),
      notes,
      recurrence,
    });

    let embedding: number[];
    try {
      embedding = await embed(text);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error: `Embedding failed — calendar item not saved: ${msg}`,
            }),
          },
        ],
      };
    }

    const calendarState = inferCalendarState({ recurrence });
    const calendarDate = inferCalendarDate({ start: normalizedStart, recurrence });
    const tags = recurrence
      ? ["calendar", calendar, recurrence]
      : ["calendar", calendar];

    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO thoughts (text, category, tags, embedding, calendar_date, calendar_state)
       VALUES ($1, $2, $3, $4::vector, $5, $6)
       RETURNING id`,
      [text, "Meetings", tags, vectorToString(embedding), calendarDate, calendarState]
    );

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            id: rows[0].id,
            calendar,
            title: title.trim(),
            start: normalizedStart,
            duration: duration.trim().toLowerCase(),
            recurrence: recurrence ?? null,
            calendar_date: calendarDate,
            calendar_state: calendarState,
            category: "Meetings",
            tags,
            message: "Calendar item saved.",
          }),
        },
      ],
    };
  },
};
