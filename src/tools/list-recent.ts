import { z } from "zod";
import { pool } from "../db/client.js";
import { CATEGORIES } from "../lib/categorize.js";

const schema = {
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(10)
    .describe("Number of recent thoughts to return (1–100, default 10)"),
  category: z
    .enum(CATEGORIES)
    .optional()
    .describe("Optional category filter"),
};

type Input = z.infer<z.ZodObject<typeof schema>>;

interface ThoughtRow {
  id: number;
  text: string;
  category: string;
  tags: string[];
  created_at: string;
}

export const listRecentTool = {
  name: "list_recent",
  description: "List your most recently saved thoughts, newest first.",
  schema,
  handler: async ({ limit, category }: Input) => {
    const categoryFilter = category ? "WHERE category = $2" : "";
    const params: (string | number)[] = [limit];
    if (category) params.push(category);

    const { rows } = await pool.query<ThoughtRow>(
      `SELECT id, text, category, tags, created_at
       FROM thoughts
       ${categoryFilter}
       ORDER BY created_at DESC
       LIMIT $1`,
      params
    );

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ thoughts: rows, count: rows.length }),
        },
      ],
    };
  },
};
