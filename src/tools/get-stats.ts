import { pool } from "../db/client.js";

interface CategoryCountRow {
  category: string;
  count: string;
}

interface TotalRow {
  total: string;
}

interface RecentRow {
  count: string;
}

interface TagRow {
  tag: string;
  count: string;
}

interface ActiveDayRow {
  day: string;
}

export const getStatsTool = {
  name: "get_stats",
  description:
    "Get statistics about your stored thoughts: totals by category, recent activity, top tags.",
  handler: async () => {
    const [
      totalResult,
      byCategoryResult,
      last7Result,
      last30Result,
      topTagsResult,
      activeDayResult,
    ] = await Promise.all([
      pool.query<TotalRow>(`SELECT COUNT(*) AS total FROM thoughts WHERE deleted_at IS NULL`),
      pool.query<CategoryCountRow>(
        `SELECT category, COUNT(*) AS count
         FROM thoughts
         WHERE deleted_at IS NULL
         GROUP BY category
         ORDER BY count DESC`
      ),
      pool.query<RecentRow>(
        `SELECT COUNT(*) AS count FROM thoughts
         WHERE deleted_at IS NULL
           AND created_at >= NOW() - INTERVAL '7 days'`
      ),
      pool.query<RecentRow>(
        `SELECT COUNT(*) AS count FROM thoughts
         WHERE deleted_at IS NULL
           AND created_at >= NOW() - INTERVAL '30 days'`
      ),
      pool.query<TagRow>(
        `SELECT tag, COUNT(*) AS count
         FROM thoughts, unnest(tags) AS tag
         WHERE deleted_at IS NULL
         GROUP BY tag
         ORDER BY count DESC
         LIMIT 10`
      ),
      pool.query<ActiveDayRow>(
        `SELECT DATE(created_at) AS day
         FROM thoughts
         WHERE deleted_at IS NULL
         GROUP BY day
         ORDER BY COUNT(*) DESC
         LIMIT 1`
      ),
    ]);

    const byCategory: Record<string, number> = {};
    for (const row of byCategoryResult.rows) {
      byCategory[row.category] = parseInt(row.count, 10);
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            total: parseInt(totalResult.rows[0].total, 10),
            by_category: byCategory,
            last_7_days: parseInt(last7Result.rows[0].count, 10),
            last_30_days: parseInt(last30Result.rows[0].count, 10),
            top_tags: topTagsResult.rows.map((r) => ({
              tag: r.tag,
              count: parseInt(r.count, 10),
            })),
            most_active_day: activeDayResult.rows[0]?.day ?? null,
          }),
        },
      ],
    };
  },
};
