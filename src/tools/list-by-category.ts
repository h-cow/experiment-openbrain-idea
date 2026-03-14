import { z } from "zod";
import { pool } from "../db/client.js";
import { CATEGORIES } from "../lib/categorize.js";

const schema = {
  category: z.enum(CATEGORIES).describe("The category to list thoughts from"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Number of thoughts per page (1–100, default 20)"),
  offset: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe("Pagination offset (default 0)"),
};

type Input = z.infer<z.ZodObject<typeof schema>>;

interface ThoughtRow {
  id: number;
  text: string;
  category: string;
  tags: string[];
  created_at: string;
}

interface CountRow {
  total: string;
}

export const listByCategoryTool = {
  name: "list_by_category",
  description: "List all thoughts in a specific category with pagination.",
  schema,
  handler: async ({
    category,
    limit,
    offset,
  }: Input) => {
    const [{ rows }, { rows: countRows }] = await Promise.all([
      pool.query<ThoughtRow>(
        `SELECT id, text, category, tags, created_at
         FROM thoughts
         WHERE category = $1
           AND deleted_at IS NULL
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [category, limit, offset]
      ),
      pool.query<CountRow>(
        `SELECT COUNT(*) AS total
         FROM thoughts
         WHERE category = $1
           AND deleted_at IS NULL`,
        [category]
      ),
    ]);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            thoughts: rows,
            count: rows.length,
            total: parseInt(countRows[0].total, 10),
          }),
        },
      ],
    };
  },
};
