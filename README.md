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
openbrain calendar | cal         Save a calendar item
openbrain search | s <query>     Semantic search
openbrain cat  | c   <category>  List thoughts in a category
openbrain recent | r             List recent thoughts
openbrain stats  | st            Show statistics
openbrain delete | d <id> [id...]  Delete one or more thoughts by ID (e.g. d 3 7 12)
```

Or run without linking: `npm run cli -- <command> [args]`

Calendar items use the same front matter shape as the calendar app:

```bash
openbrain calendar \
  --calendar russell \
  --title "Builder Call" \
  --start 2026-03-17T11:00 \
  --duration 90m \
  --notes "Discuss calendar parsing and rollout." \
  --recurrence weekly
```

Calendar command options:

```bash
openbrain calendar \
  --calendar <russell|family> \
  --title "<event title>" \
  --start <YYYY-MM-DDTHH:mm|ISO-8601 datetime> \
  --duration <duration> \
  [--notes "<optional notes>"] \
  [--recurrence <daily|weekly|monthly|yearly>]
```

Duration formats:

- `30m` for minutes
- `2h` for hours

Examples:

- `15m`
- `45m`
- `1h`
- `2h`

Recurrence values:

- `daily`
- `weekly`
- `monthly`
- `yearly`

Notes:

- `--calendar` must be either `russell` or `family`
- `--start` accepts a local datetime like `2026-03-17T11:00` or a full ISO timestamp like `2026-03-17T11:00:00-06:00`
- If `--start` does not include a timezone offset, it is normalized using `CALENDAR_TIMEZONE` or `America/Boise`
- Omitting `--recurrence` creates a one-time calendar item

## Categories

`Projects` · `Real Estate` · `Farm` · `Learning` · `Recipes` · `People` · `Checklists` · `Decisions` · `Reflections` · `Meetings` · `Misc`
