import { pool } from "./client.js";

export async function migrate(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`CREATE EXTENSION IF NOT EXISTS vector`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS thoughts (
        id          SERIAL PRIMARY KEY,
        text        TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 8000),
        category    VARCHAR(50) NOT NULL DEFAULT 'Misc',
        tags        TEXT[] NOT NULL DEFAULT '{}',
        embedding   VECTOR(1536),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
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

  } finally {
    client.release();
  }
}
