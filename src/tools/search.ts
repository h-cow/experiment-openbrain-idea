import { z } from "zod";
import { pool } from "../db/client.js";
import { CATEGORIES } from "../lib/categorize.js";
import { embed, vectorToString } from "../lib/embeddings.js";

const schema = {
  query: z.string().min(1).describe("Natural language search query"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(5)
    .describe("Maximum number of results (1–50, default 5)"),
  category: z
    .enum(CATEGORIES)
    .optional()
    .describe("Filter results to a specific category"),
  min_similarity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe("Minimum cosine similarity threshold (0–1, default 0.3)"),
};

type Input = z.infer<z.ZodObject<typeof schema>>;

interface ThoughtRow {
  id: number;
  text: string;
  category: string;
  tags: string[];
  similarity: number;
  created_at: string;
}

export const searchTool = {
  name: "search",
  description:
    "Semantically search your stored thoughts using natural language. Returns results ranked by similarity.",
  schema,
  handler: async ({
    query,
    limit,
    category,
    min_similarity,
  }: Input) => {
    const embedding = await embed(query);
    const vecStr = vectorToString(embedding);

    const categoryFilter = category ? "AND category = $3" : "";
    const params: (string | number)[] = [vecStr, limit];
    if (category) params.push(category);

    const { rows } = await pool.query<ThoughtRow>(
      `SELECT
         id,
         text,
         category,
         tags,
         created_at,
         1 - (embedding <=> $1::vector) AS similarity
       FROM thoughts
       WHERE embedding IS NOT NULL
       ${categoryFilter}
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      params
    );

    const filtered = rows.filter((r) => r.similarity >= min_similarity);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            results: filtered,
            count: filtered.length,
          }),
        },
      ],
    };
  },
};
