import { z } from "zod";
import { pool } from "../db/client.js";

const schema = {
  ids: z.array(z.number().int().positive()).min(1).describe("One or more thought IDs to delete"),
};

type Input = z.infer<z.ZodObject<typeof schema>>;

export const deleteThoughtTool = {
  name: "delete_thought",
  description:
    "Permanently delete one or more thoughts by their IDs. Returns an error for any IDs that do not exist.",
  schema,
  handler: async ({ ids }: Input) => {
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
    const { rowCount } = await pool.query(
      `DELETE FROM thoughts WHERE id = ANY(ARRAY[${placeholders}]::int[])`,
      ids
    );

    if (!rowCount) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error: `No thoughts found with ids ${ids.join(", ")}.`,
            }),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ message: `Deleted ${rowCount} thought(s).`, deleted: rowCount }),
        },
      ],
    };
  },
};
