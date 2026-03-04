# OpenBrain Plan

We're building a **local MCP server** (TypeScript) backed by **Postgres + pgvector** that any MCP client can talk to. The core idea from the video: your AI tools shouldn't each have their own siloed memory — you need **one open brain** that any agent can read/write.

## How It Works

**Capture flow:** You drop a thought → MCP server auto-categorizes it via LLM (projects, recipes, people, learning, etc.), generates a vector embedding, and stores everything in Postgres.

**Retrieval flow:** Any MCP client calls `search` with natural language → server embeds the query → pgvector finds semantically similar entries → returns ranked results.

## 6 Core Tools

|Tool|What it does|
|---|---|
|`add_thought`|Capture anything — auto-categorized & embedded|
|`search`|Semantic search by meaning, not just keywords|
|`list_recent`|Latest entries, optionally filtered|
|`list_by_category`|Browse by category (recipes, people, etc.)|
|`get_stats`|Patterns, activity, top tags|
|`delete_thought`|Remove entries|

## Your Categories (Pre-seeded)

Projects, Real Estate, Farm, Learning, Recipes, People, Checklists, Decisions, Reflections, Meetings, Misc — all auto-detected so you just dump thoughts with zero friction.

## Execution Order

1. Postgres + pgvector setup locally
2. Scaffold TypeScript MCP project
3. Build `add_thought` + embedding pipeline
4. Build `search` (semantic)
5. Build list/filter tools
6. Wire up auto-categorization
7. Connect to an MCP client and test

**Phase 1 is ~1.5 hours of focused work.** Phase 2 adds hybrid search (vector + full-text), stats, and MCP resources. Phase 3 is weekly reviews, thought templates, and bulk import from your existing notes.