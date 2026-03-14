import { z } from "zod";
import { pool } from "../db/client.js";

const schema = {
  ids: z.array(z.number().int().positive()).min(1).describe("One or more thought IDs to mark as deleted"),
};

type Input = z.infer<z.ZodObject<typeof schema>>;

export const deleteThoughtTool = {
  name: "delete_thought",
  description:
    "Mark one or more thoughts as deleted by their IDs. Returns an error if none of the provided IDs are active thoughts.",
  schema,
  handler: async ({ ids }: Input) => {
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
    const { rowCount } = await pool.query(
      `UPDATE thoughts
       SET deleted_at = NOW()
       WHERE id = ANY(ARRAY[${placeholders}]::int[])
         AND deleted_at IS NULL`,
      ids
    );

    if (!rowCount) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error: `No active thoughts found with ids ${ids.join(", ")}.`,
            }),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            message: `Marked ${rowCount} thought(s) as deleted.`,
            deleted: rowCount,
          }),
        },
      ],
    };
  },
};
