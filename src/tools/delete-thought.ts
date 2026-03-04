import { z } from "zod";
import { pool } from "../db/client.js";

const schema = {
  id: z.number().int().positive().describe("The ID of the thought to delete"),
};

type Input = z.infer<z.ZodObject<typeof schema>>;

export const deleteThoughtTool = {
  name: "delete_thought",
  description:
    "Permanently delete a thought by its ID. Returns an error if the ID does not exist.",
  schema,
  handler: async ({ id }: Input) => {
    const { rowCount } = await pool.query(
      `DELETE FROM thoughts WHERE id = $1`,
      [id]
    );

    if (!rowCount) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error: `No thought found with id ${id}.`,
            }),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ message: "Thought deleted." }),
        },
      ],
    };
  },
};
