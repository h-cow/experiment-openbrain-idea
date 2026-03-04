import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const CATEGORIES = [
  "Projects",
  "Real Estate",
  "Farm",
  "Learning",
  "Recipes",
  "People",
  "Checklists",
  "Decisions",
  "Reflections",
  "Meetings",
  "Misc",
] as const;

export type Category = (typeof CATEGORIES)[number];

interface CategorizationResult {
  category: Category;
  tags: string[];
}

const SYSTEM_PROMPT = `You are a categorization assistant. Given a thought or note, return a JSON object with:
1. "category": exactly one of: Projects, Real Estate, Farm, Learning, Recipes, People, Checklists, Decisions, Reflections, Meetings, Misc
2. "tags": array of 0–5 lowercase keyword tags extracted from the content

If the content does not clearly fit any category, use "Misc".
Return only valid JSON, no other text.`;

export async function categorize(text: string): Promise<CategorizationResult> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Thought: ${text}` },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("Empty categorization response");

  const parsed = JSON.parse(content) as { category?: unknown; tags?: unknown };

  const category =
    typeof parsed.category === "string" &&
    (CATEGORIES as readonly string[]).includes(parsed.category)
      ? (parsed.category as Category)
      : "Misc";

  const tags = Array.isArray(parsed.tags)
    ? (parsed.tags as unknown[])
        .filter((t) => typeof t === "string")
        .slice(0, 5)
    : [];

  return { category, tags: tags as string[] };
}
