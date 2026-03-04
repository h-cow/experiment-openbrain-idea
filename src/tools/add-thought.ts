import { z } from "zod";
import { pool } from "../db/client.js";
import { categorize, CATEGORIES } from "../lib/categorize.js";
import { embed, vectorToString } from "../lib/embeddings.js";

const schema = {
  text: z
    .string()
    .min(1)
    .max(8000)
    .describe("The thought or note to save (1–8000 characters)"),
  category: z
    .enum(CATEGORIES)
    .optional()
    .describe("Override auto-categorization with one of the 11 categories"),
};

type Input = z.infer<z.ZodObject<typeof schema>>;

export const addThoughtTool = {
  name: "add_thought",
  description:
    "Save a thought, note, or piece of information to your memory. Auto-categorizes and embeds for semantic search.",
  schema,
  handler: async ({ text, category }: Input) => {
    // Embed first — hard fail if this fails (no point saving without search)
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
              error: `Embedding failed — thought not saved: ${msg}`,
            }),
          },
        ],
      };
    }

    // Categorize — graceful fallback to Misc
    let resolvedCategory = category ?? "Misc";
    let tags: string[] = [];
    let categorizationNote = "";

    if (!category) {
      try {
        const result = await categorize(text);
        resolvedCategory = result.category;
        tags = result.tags;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        categorizationNote = ` (categorization failed: ${msg}; saved as Misc)`;
      }
    }

    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO thoughts (text, category, tags, embedding)
       VALUES ($1, $2, $3, $4::vector)
       RETURNING id`,
      [text, resolvedCategory, tags, vectorToString(embedding)]
    );

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            id: rows[0].id,
            category: resolvedCategory,
            tags,
            message: `Thought saved.${categorizationNote}`,
          }),
        },
      ],
    };
  },
};
