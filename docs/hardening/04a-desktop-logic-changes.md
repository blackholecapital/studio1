# STEP 4A — Desktop Logic Extraction Changes

## Scope & guardrails applied
- Desktop-only logic was extracted from `src/ui/App.tsx` into desktop modules.
- `src/ui/MobileApp.tsx` was not changed.
- No panel JSX decomposition was performed.
- No CSS or visual behavior changes were introduced.
- No API/deploy/upload contract shapes were changed.

## App.tsx size delta
- Before: `1637` lines
- After: `1485` lines
- Net: `-152` lines

## Extracted logic blocks
1. **Derived desktop state selectors**
   - Selected card lookup and page navigation/lock derivations extracted.
   - New module: `src/ui/desktop/lib/derivedState.ts`.

2. **Desktop card state reducers**
   - Selected-card patching.
   - Per-card lock toggles (size/position).
   - Page lock toggle reducer.
   - Selected-card delete reducer.
   - New module: `src/ui/desktop/state/desktopReducers.ts`.

3. **Desktop upload flow hook**
   - Content upload orchestration (size guard, optimistic blob URL, PNG conversion, upload result reconciliation).
   - New module: `src/ui/desktop/hooks/useDesktopUploadFlow.ts`.

4. **Desktop deploy/save/download flow hook**
   - Save validation + project write orchestration.
   - Deploy validation + slug normalization + payload build + deploy + modal/status updates.
   - Download JSON orchestration.
   - New module: `src/ui/desktop/hooks/useDesktopDeployFlow.ts`.

## Behavior parity notes
- Existing drag/drop and interaction semantics in `App.tsx` are unchanged.
- Existing deploy modal, status banner, and save/deploy button UX wiring are unchanged.
- Existing upload behavior and optimistic preview semantics are unchanged.

## Checkpoint
**safe to proceed**
