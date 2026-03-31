# Build Audit Report v3

## Likely primary failures
1. `packages/app-core/src/commands/index.ts` imported Node `crypto.randomUUID()` inside code executed by the browser bundle.
2. The same file read `process.env.*` during client-side project creation.
3. `ProjectSetup` depended on `FormData(e.currentTarget)` and did not surface command crashes inline.
4. `editorStore.initProject()` had no `try/catch`, so any command exception aborted state initialization silently from the user’s perspective.

## Symptoms explained
- Clicking **Create Project** keeps the app in `No Project Loaded`.
- Earlier console error matched the `randomUUID` failure path.
- After partial fixes, any remaining exception in project creation could still fail without inline UI feedback.

## Files fixed
- `packages/app-core/src/commands/index.ts`
- `packages/app-core/src/utils/createId.ts`
- `apps/editor-web/state/editorStore.ts`
- `apps/editor-web/components/controls/LeftRail.tsx`
- `apps/editor-web/app/icon.svg`

## Patch summary
- Replaced Node-only UUID generation with browser-safe `createId()`.
- Removed `process.env` reads from browser-executed command code.
- Wrapped project creation in a guarded `try/catch`.
- Changed project setup to use controlled React state directly and show inline errors when initialization fails.
- Added app icon to remove favicon 404 noise.

## Remaining deployment note
This repo still could not be fully installed in-container because workspace dependency install requires auth, so this audit is source-level and runtime-trace-driven. The patch is targeted at the create-project boot path, which is the broken path shown in your screenshots.
