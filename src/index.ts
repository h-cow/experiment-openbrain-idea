import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { migrate } from "./db/migrate.js";
import { addThoughtTool } from "./tools/add-thought.js";
import { searchTool } from "./tools/search.js";
import { listRecentTool } from "./tools/list-recent.js";
import { listByCategoryTool } from "./tools/list-by-category.js";
import { getStatsTool } from "./tools/get-stats.js";
import { deleteThoughtTool } from "./tools/delete-thought.js";

// Validate required environment variables before doing anything else
const missing: string[] = [];
if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
if (!process.env.OPENAI_API_KEY) missing.push("OPENAI_API_KEY");

if (missing.length > 0) {
  console.error(
    `ERROR: Missing required environment variables: ${missing.join(", ")}\n` +
      `Copy .env.example to .env and fill in the values.`
  );
  process.exit(1);
}

async function main() {
  // Run database migrations on startup
  try {
    await migrate();
  } catch (err) {
    console.error("Database migration failed:", err);
    process.exit(1);
  }

  const server = new McpServer({
    name: "openbrain",
    version: "0.1.0",
  });

  // Register tools with schemas (v1.5.0 API: server.tool(name, description, schema, cb))
  server.tool(addThoughtTool.name, addThoughtTool.description, addThoughtTool.schema, addThoughtTool.handler);
  server.tool(searchTool.name, searchTool.description, searchTool.schema, searchTool.handler);
  server.tool(listRecentTool.name, listRecentTool.description, listRecentTool.schema, listRecentTool.handler);
  server.tool(listByCategoryTool.name, listByCategoryTool.description, listByCategoryTool.schema, listByCategoryTool.handler);
  server.tool(deleteThoughtTool.name, deleteThoughtTool.description, deleteThoughtTool.schema, deleteThoughtTool.handler);
  // get_stats has no parameters
  server.tool(getStatsTool.name, getStatsTool.description, getStatsTool.handler);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("OpenBrain MCP server running on stdio.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
