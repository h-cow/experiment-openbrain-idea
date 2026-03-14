import { pool } from "./client.js";

export async function migrate(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`CREATE EXTENSION IF NOT EXISTS vector`);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'calendar_state_enum'
        ) THEN
          CREATE TYPE calendar_state_enum AS ENUM (
            'none',
            'once',
            'daily',
            'weekly',
            'monthly',
            'yearly'
          );
        END IF;
      END
      $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS thoughts (
        id          SERIAL PRIMARY KEY,
        text        TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 8000),
        category    VARCHAR(50) NOT NULL DEFAULT 'Misc',
        tags        TEXT[] NOT NULL DEFAULT '{}',
        embedding   VECTOR(1536),
        calendar_date DATE,
        calendar_state calendar_state_enum,
        deleted_at  TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      DO $$
      BEGIN
        ALTER TABLE thoughts
        ADD COLUMN IF NOT EXISTS calendar_date DATE,
        ADD COLUMN IF NOT EXISTS calendar_state calendar_state_enum,
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'thoughts'
            AND column_name = 'calendar_state'
            AND udt_name <> 'calendar_state_enum'
        ) THEN
          ALTER TABLE thoughts
          ALTER COLUMN calendar_state TYPE calendar_state_enum
          USING CASE
            WHEN calendar_state IN ('none', 'once', 'daily', 'weekly', 'monthly', 'yearly')
              THEN calendar_state::calendar_state_enum
            ELSE NULL
          END;
        END IF;
      END
      $$;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS thoughts_embedding_idx
        ON thoughts USING hnsw (embedding vector_cosine_ops)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS thoughts_category_idx
        ON thoughts (category)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS thoughts_created_at_idx
        ON thoughts (created_at DESC)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS thoughts_deleted_at_idx
        ON thoughts (deleted_at)
    `);

  } finally {
    client.release();
  }
}
