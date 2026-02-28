# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Manuscrypt is an AI-powered book writing platform for literary fiction, built with Nuxt 3. It provides a context-aware writing assistant (Claude API), collaborative character/world-building tools, a TipTap rich text editor, and manuscript management with export capabilities.

## Commands

```bash
# Development
bun install              # Install dependencies
bun run dev              # Start dev server (http://localhost:3000)
bun run build            # Production build

# Testing
bun run test             # Vitest in watch mode
bun run test:run         # Single test run
bun run test:coverage    # Run with v8 coverage
npx vitest run tests/server/utils/validation.test.ts  # Run a single test file

# Database (Drizzle ORM + SQLite)
bun run db:generate      # Generate migrations from schema
bun run db:push          # Push schema changes to DB
bun run db:studio        # Open Drizzle Studio GUI
```

## Architecture

### Tech Stack
- **Frontend:** Nuxt 3 + Vue 3 Composition API, TypeScript, Pinia, TipTap editor
- **Backend:** Nitro server (Bun preset), Drizzle ORM + SQLite (better-sqlite3)
- **AI:** Anthropic SDK (`@anthropic-ai/sdk`) — two model tiers configured via `runtimeConfig` (fast=Haiku, smart=Sonnet)
- **UI:** @nuxt/ui v3 with Tailwind CSS (primary=amber, neutral=stone), Lucide icons
- **Validation:** Zod schemas for all API inputs

### Directory Layout
- `app/` — Frontend (Nuxt 3 convention with `future.compatibilityVersion: 4`)
  - `pages/` — File-based routing (index, projects, settings, project/[id]/*)
  - `layouts/` — `default.vue` and `writing.vue`
  - `components/` — Organized by feature: `editor/`, `bible/`, `agents/`, `outline/`, `export/`, `project/`, `app/`
  - `composables/` — Feature-scoped state and logic
  - `stores/` — Pinia stores (AI chat sessions)
  - `utils/` — SSE parsing, export helpers
- `server/` — Backend
  - `api/` — REST endpoints (file-based routing: `books/`, `chapters/`, `scenes/`, `characters/`, `locations/`, `relationships/`, `ai/`, `export/`, `writing-sessions/`)
  - `database/` — Schema (`schema.ts`) and initialization (`index.ts`)
  - `utils/` — `ai-stream.ts`, `ai-prompts.ts`, `validation.ts`, `crud.ts`, `tiptap.ts`, `rate-limit.ts`
  - `plugins/` — DB table init, env validation
- `shared/types/` — TypeScript interfaces shared between client and server
- `tests/` — Vitest tests mirroring `client/` and `server/` structure
- `data/` — SQLite database file (gitignored)

### Key Patterns

**Composable Factory (`useResource`):** Generic CRUD composable factory in `app/composables/useResource.ts` generates typed hooks for all entities. Used by `useBook`, `useChapter`, `useScene`, `useCharacter`, `useLocation`, `useRelationship`.

**AI Streaming:** Server uses `H3 EventStream` via `server/utils/ai-stream.ts`. Client consumes SSE via custom parser in `app/utils/sse.ts`. The `useAiAssistant` composable manages sessions keyed by `"interview:{bookId}:{characterId}"` or `"general:{bookId}"`.

**Context-Aware AI:** `server/utils/ai-prompts.ts` builds full book context (characters, locations, relationships, neighboring chapter synopses, current content) passed as system prompts to Claude. Commands: `continue`, `deepen`, `dialogue`, `action`, `character-voice`.

**Editor Draft Safety:** TipTap editor auto-saves to localStorage every 2s and debounce-saves to server every 1s. Recovery modal appears on reload if a newer draft exists in localStorage.

**CRUD Helpers:** `server/utils/crud.ts` provides reusable handler factories for GET-by-ID and DELETE-by-ID patterns. All request bodies validated with Zod schemas from `server/utils/validation.ts`.

### Database

SQLite with WAL mode, foreign keys enforced, cascade deletes. Schema in `server/database/schema.ts`. Tables: `books`, `chapters`, `scenes`, `characters`, `characterRelationships`, `locations`, `aiMessages`, `writingSessions`.

### Environment

Required: `NUXT_ANTHROPIC_API_KEY` (see `.env.example`). Optional model overrides: `NUXT_ANTHROPIC_FAST_MODEL`, `NUXT_ANTHROPIC_SMART_MODEL`.
