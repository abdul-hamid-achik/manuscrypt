# Manuscrypt — Product Owner Review (Writer-Workflow Pass)

## Scope reviewed
- Writing session flow: chapter list, chapter editor, AI assistant commands, autosave/draft recovery, outline generation/apply, and progress/statistics surfaces.
- Focus on whether the web app effectively serves writers in day-to-day use, not just compile/lint correctness.

## Top findings

### P1 — Prevent title-loss via blank title saves
- **Where:** `app/pages/project/[id]/write/[chapterId].vue`
- **Issue:** Chapter title is debounced and pushed on every change, but empty titles are submitted directly. The server rejects empty titles (`min:1`), and failures are not surfaced to the user.
- **Product impact:** Writers lose trust in title editing (silent failure, unclear state).

### P1 — Clarify AI action consequences before destructive apply
- **Where:** `app/pages/project/[id]/outline/index.vue`, `server/api/ai/generate-outline.post.ts`
- **Issue:** Replace mode rewrites outline; preview does not force explicit confirmation and lacks scope summary (`X existing chapters will be replaced`).
- **Product impact:** High-risk for writers; one click can wipe planning work.

### P1 — Improve AI command reliability feedback
- **Where:** `app/composables/useAiAssistant.ts`, `app/components/agents/AgentPanel.vue`
- **Issue:** If streaming fails, assistant UI shows a generic error but command context/insert/replace results are not explicitly surfaced in a recoverable workflow (e.g., retry, copy draft output, or open a fallback composer).
- **Product impact:** Writer loses output and has to re-run commands without context.

### P2 — Persisted session continuity on tab changes
- **Where:** `app/composables/useWritingStats.ts`, `app/composables/useEditor.ts`
- **Issue:** Autosave writes every second and draft recovery restores on load, but there is no explicit "Unsynced changes" indicator when save errors occur.
- **Product impact:** Writer may continue editing while local/offline save is failing.

### P2 — Better AI command discoverability by context
- **Where:** `app/components/agents/AgentPanel.vue`, command palette in write layout flow
- **Issue:** No indication whether a command operates on selected text, last paragraph, or full chapter context.
- **Product impact:** Increased confusion and reduced adoption of commands.

## Recommended backlog (prioritized)

1. **Must Have** — Validate and guard chapter title updates in write page
   - **Story**: As a writer, I want an invalid chapter title update to be blocked with a clear message, so I don't unknowingly lose my title changes.
   - **Acceptance**
     - Empty title input is blocked on submit.
     - User sees inline validation message and save status reflects "Title not saved" with a retry option.

2. **Must Have** — Confirm destructive outline replace before execution
   - **Story**: As a writer, I want a confirmation modal before replacing the outline, so I can avoid accidental data loss.
   - **Acceptance**
     - If in replace mode, modal shows how many existing chapters/scenes will be removed.
     - User can cancel.
     - User can choose a backup option (copy current outline to a snapshot) before apply.

3. **Should Have** — Add retry-friendly AI failure paths
   - **Story**: As a writer, I want failed AI command output to be preserved and reusable, so I can continue writing when model/network issues happen.
   - **Acceptance**
     - Failed stream keeps partial assistant text available.
     - UI provides "Retry" and "Copy output" actions.

4. **Should Have** — Add unsynced indicator and manual sync control
   - **Story**: As a writer, I want clear feedback when local draft and server sync diverge, so I can decide to keep retrying saves or continue drafting locally.
   - **Acceptance**
     - Save status distinguishes "saving failed" from normal error states.
     - Draft recovery UI indicates whether restored draft is from auto-save or manual local copy.

5. **Could Have** — Command context chips
   - **Story**: As a writer, I want to know the command context before running AI actions, so I can trust edits.
   - **Acceptance**
     - Command list in panel shows expected input target (`selection`, `trailing paragraph`, `chapter`).
     - If no selection exists and a command requires it, panel prompts for selection.

6. **Could Have** — Export and review quality-of-life
   - **Story**: As a writer, I want to quickly compare latest chapter changes against prior revision when reviewing, so I can decide if edits improved the text.
   - **Acceptance**
     - Add lightweight "version diff preview" in `VersionHistory`.
     - Show at least previous snapshot and word-count delta.

## Non-blocking notes
- Core engine stability and linting are already strong after prior strict typing pass.
- This pass intentionally focuses on product confidence, safety, and writer trust rather than further style/lint cleanups.
