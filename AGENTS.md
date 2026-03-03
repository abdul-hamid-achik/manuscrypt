# AGENTS.md

This file provides guidance for AI coding agents working with the Manuscrypt codebase. For project overview, architecture, and commands, see [CLAUDE.md](./CLAUDE.md).

## Coding Standards

### TypeScript
- Strict mode enabled. No `any` types — use proper typing or `unknown` with narrowing.
- Use Vue 3 Composition API with `<script setup lang="ts">` for all components.
- Prefer `const` over `let`. No `var`.

### Vue / Nuxt Conventions
- Auto-imports are enabled — do not manually import `ref`, `computed`, `useState`, `useRoute`, `useFetch`, etc.
- Components are auto-registered — do not import them in templates.
- Use Nuxt file-based routing. Do not create a manual router config.
- Composables go in `app/composables/` and must start with `use` prefix.

### API Endpoints
- Follow Nuxt server route conventions: `server/api/{resource}/[id].{method}.ts`.
- Validate all request bodies with Zod schemas defined in `server/utils/validation.ts`.
- Use the CRUD helper factories from `server/utils/crud.ts` for standard operations.
- Return proper HTTP status codes. Use `createError` from H3 for error responses.

### Database
- All schema changes go through `server/database/schema.ts` using Drizzle ORM.
- After schema changes, run `bun run db:generate` then `bun run db:push`.
- Use parameterized queries — never interpolate user input into SQL.
- Foreign keys use cascade deletes where appropriate.

### Testing
- Tests live in `tests/` mirroring the source structure (e.g., `tests/server/utils/validation.test.ts`).
- Use Vitest. Run `bun run test:run` before submitting changes.
- Test files use `.test.ts` extension.

### UI
- Use `@nuxt/ui` v3 components (`UButton`, `UInput`, `UModal`, etc.) — do not create custom versions of existing UI components.
- Tailwind CSS for styling. Theme: primary=amber, neutral=stone.
- Icons from Lucide (`lucide-vue-next`).

## Common Pitfalls

- **Do not modify `nuxt.config.ts`** unless the task explicitly requires it.
- **Do not install new dependencies** without confirming with the user first.
- **SQLite runs in WAL mode** — do not change the pragma settings in `server/database/index.ts`.
- **AI streaming uses H3 EventStream**, not WebSockets. Do not switch transport.
- **The `useResource` composable factory** handles all entity CRUD — extend it rather than creating parallel patterns.
- **localStorage draft recovery** is intentional safety behavior — do not remove or disable it.

## Workflow

1. Read relevant source files before making changes.
2. Follow existing patterns in the codebase — consistency over novelty.
3. Run `bun run test:run` to verify changes don't break existing tests.
4. Keep changes minimal and focused on the task at hand.
