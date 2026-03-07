import pg from "pg";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const { Pool } = pg;

// Load .env from the package root (works whether run via `npm run cli` or global `openbrain`)
const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  process.loadEnvFile(resolve(__dirname, "../../.env"));
} catch {
  // .env not found — rely on env vars already set in the environment
}

if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable is required.");
  process.exit(1);
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err);
});
