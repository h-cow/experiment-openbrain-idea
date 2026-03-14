#!/usr/bin/env node
import { migrate } from "./db/migrate.js";
import { pool } from "./db/client.js";
import { addThoughtTool } from "./tools/add-thought.js";
import { searchTool } from "./tools/search.js";
import { listRecentTool } from "./tools/list-recent.js";
import { listByCategoryTool } from "./tools/list-by-category.js";
import { getStatsTool } from "./tools/get-stats.js";
import { deleteThoughtTool } from "./tools/delete-thought.js";
import { addCalendarThoughtTool } from "./tools/add-calendar-thought.js";
import { CALENDARS, RECURRENCES } from "./lib/calendar.js";

const HELP = `
openbrain <command> [args]

Commands:
  add  | a   <text>      Save a thought (auto-categorized)
  calendar | cal         Save a calendar item
  search | s <query>     Semantic search
  cat  | c   <category>  List thoughts in a category
  recent | r             List recent thoughts
  stats  | st            Show statistics
  delete | d <id> [id...]  Delete one or more thoughts by ID (e.g. d 3 7 12)
`.trim();

function result<T>(tool: { content: Array<{ text: string }> }): T {
  return JSON.parse(tool.content[0].text) as T;
}

function fmtDate(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

function fmtThought(t: { id: number; text: string; category: string; tags: string[]; created_at: string; similarity?: number }) {
  const sim = t.similarity !== undefined ? `  sim:${t.similarity.toFixed(2)}` : "";
  const tags = t.tags.length ? `  [${t.tags.join(", ")}]` : "";
  const date = fmtDate(t.created_at);
  console.log(`#${t.id}  ${date}  (${t.category})${sim}`);
  console.log(`  ${t.text}`);
  if (tags) console.log(`  tags:${tags}`);
  console.log();
}

function parseFlags(args: string[]) {
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const key = arg.slice(2);
    const value = args[i + 1];
    if (!key || !value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    flags[key] = value;
    i += 1;
  }

  return flags;
}

async function run() {
  const missing: string[] = [];
  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!process.env.OPENAI_API_KEY) missing.push("OPENAI_API_KEY");
  if (missing.length) {
    console.error(`Missing env vars: ${missing.join(", ")}`);
    process.exit(1);
  }

  await migrate();

  const [cmd, ...rest] = process.argv.slice(2);
  const text = rest.join(" ").trim();

  switch (cmd) {
    case "add":
    case "a": {
      if (!text) { console.error("Usage: openbrain add <text>"); process.exit(1); }
      const out = result<{ id: number; category: string; tags: string[]; message: string; error?: string }>(
        await addThoughtTool.handler({ text })
      );
      if (out.error) { console.error(out.error); process.exit(1); }
      const tags = out.tags.length ? `  tags: [${out.tags.join(", ")}]` : "";
      console.log(`Saved #${out.id}  (${out.category})${tags}`);
      break;
    }

    case "calendar":
    case "cal": {
      let flags: Record<string, string>;
      try {
        flags = parseFlags(rest);
      } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        console.error(
          `Usage: openbrain calendar --calendar <${CALENDARS.join("|")}> --title <title> --start <YYYY-MM-DDTHH:mm or ISO> --duration <30m|2h> [--notes <text>] [--recurrence <${RECURRENCES.join("|")}>]`
        );
        process.exit(1);
      }

      const out = result<{
        id: number;
        calendar: string;
        title: string;
        start: string;
        duration: string;
        recurrence: string | null;
        calendar_date: string | null;
        calendar_state: string;
        category: string;
        tags: string[];
        message: string;
        error?: string;
      }>(
        await addCalendarThoughtTool.handler({
          calendar: flags.calendar as "russell" | "family",
          title: flags.title,
          start: flags.start,
          duration: flags.duration,
          notes: flags.notes,
          recurrence: flags.recurrence as "daily" | "weekly" | "monthly" | "yearly" | undefined,
        })
      );

      if (out.error) {
        console.error(out.error);
        process.exit(1);
      }

      const recurrenceLabel = out.recurrence ? `  recurrence:${out.recurrence}` : "";
      const dateLabel = out.calendar_date ? `  date:${out.calendar_date}` : "";
      console.log(
        `Saved #${out.id}  (${out.category})  calendar:${out.calendar}  state:${out.calendar_state}${dateLabel}${recurrenceLabel}`
      );
      console.log(`  ${out.title} @ ${out.start} for ${out.duration}`);
      break;
    }

    case "search":
    case "s": {
      if (!text) { console.error("Usage: openbrain search <query>"); process.exit(1); }
      const out = result<{ results: Array<{ id: number; text: string; category: string; tags: string[]; created_at: string; similarity: number }>; count: number }>(
        await searchTool.handler({ query: text, limit: 5, min_similarity: 0.3 })
      );
      console.log(`${out.count} result(s) for "${text}"\n`);
      out.results.forEach(fmtThought);
      break;
    }

    case "cat":
    case "c": {
      if (!text) { console.error("Usage: openbrain cat <category>"); process.exit(1); }
      const out = result<{ thoughts: Array<{ id: number; text: string; category: string; tags: string[]; created_at: string }>; count: number; total: number }>(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await listByCategoryTool.handler({ category: text as any, limit: 20, offset: 0 })
      );
      console.log(`${out.count} / ${out.total} thoughts in "${text}"\n`);
      out.thoughts.forEach(fmtThought);
      break;
    }

    case "recent":
    case "r": {
      const out = result<{ thoughts: Array<{ id: number; text: string; category: string; tags: string[]; created_at: string }>; count: number }>(
        await listRecentTool.handler({ limit: 10 })
      );
      console.log(`${out.count} recent thought(s)\n`);
      out.thoughts.forEach(fmtThought);
      break;
    }

    case "stats":
    case "st": {
      const out = result<{
        total: number;
        by_category: Record<string, number>;
        last_7_days: number;
        last_30_days: number;
        top_tags: Array<{ tag: string; count: number }>;
        most_active_day: string | null;
      }>(await getStatsTool.handler());

      console.log(`Total: ${out.total} thoughts`);
      console.log(`Last 7d: ${out.last_7_days}  |  Last 30d: ${out.last_30_days}`);
      if (out.most_active_day) console.log(`Most active: ${out.most_active_day}`);
      console.log("\nBy category:");
      for (const [cat, count] of Object.entries(out.by_category)) {
        console.log(`  ${cat.padEnd(16)} ${count}`);
      }
      if (out.top_tags.length) {
        console.log("\nTop tags:");
        console.log("  " + out.top_tags.map((t) => `${t.tag} (${t.count})`).join("  "));
      }
      break;
    }

    case "delete":
    case "d": {
      const ids = rest.map((s) => parseInt(s, 10));
      if (!ids.length || ids.some(isNaN)) { console.error("Usage: openbrain delete <id> [id ...]"); process.exit(1); }
      const out = result<{ message?: string; deleted?: number; error?: string }>(
        await deleteThoughtTool.handler({ ids })
      );
      if (out.error) { console.error(out.error); process.exit(1); }
      console.log(out.message);
      break;
    }

    default:
      console.log(HELP);
      if (cmd) process.exit(1);
  }

  await pool.end();
}

run().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
