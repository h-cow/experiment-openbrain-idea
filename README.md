# OpenBrain

A local memory CLI — save thoughts, search them semantically, keep one brain across everything.

Drop a thought from the terminal. It gets auto-categorized and embedded. Retrieve anything later via semantic search.

This is a concept posted by Nate B Jones https://www.youtube.com/watch?v=2JiMmye2ezg

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

## CLI

Install globally then use from anywhere:

```bash
npm run build
npm link
```

```
openbrain add  | a   <text>      Save a thought (auto-categorized)
openbrain search | s <query>     Semantic search
openbrain cat  | c   <category>  List thoughts in a category
openbrain recent | r             List recent thoughts
openbrain stats  | st            Show statistics
openbrain delete | d <id> [id...]  Delete one or more thoughts by ID (e.g. d 3 7 12)
```

Or run without linking: `npm run cli -- <command> [args]`

## Categories

`Projects` · `Real Estate` · `Farm` · `Learning` · `Recipes` · `People` · `Checklists` · `Decisions` · `Reflections` · `Meetings` · `Misc`
