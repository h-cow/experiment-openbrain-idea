# OpenBrain

A local MCP memory server — one brain for all your AI tools.

Drop a thought from Claude Desktop, Cursor, or any MCP client. It gets auto-categorized and embedded. Any agent can retrieve it later via semantic search.

## Setup

**Requirements:** Docker Desktop, Node.js 20+, an OpenAI API key.

### 1. Start Postgres

```bash
docker compose up -d
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and set your OPENAI_API_KEY
```

### 3. Build and run

```bash
npm install
npm run build
node dist/index.js
```

The server auto-migrates the schema on first run.

## Claude Desktop integration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "openbrain": {
      "command": "node",
      "args": ["/absolute/path/to/openBrain/dist/index.js"],
      "env": {
        "DATABASE_URL": "postgres://openbrain:openbrain@localhost:5432/openbrain",
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

Restart Claude Desktop.

## Tools

| Tool | Description |
|------|-------------|
| `add_thought` | Save a note. Auto-categorizes and embeds. |
| `search` | Semantic search across all thoughts. |
| `list_recent` | Most recent thoughts, newest first. |
| `list_by_category` | Paginated list within a category. |
| `get_stats` | Counts by category, top tags, recent activity. |
| `delete_thought` | Hard delete by ID. |

## Categories

`Projects` · `Real Estate` · `Farm` · `Learning` · `Recipes` · `People` · `Checklists` · `Decisions` · `Reflections` · `Meetings` · `Misc`
