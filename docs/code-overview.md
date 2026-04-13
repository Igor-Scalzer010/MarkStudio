# 🗺️ MarkStudio Code Overview

This document is a maintainer-oriented map of the current MarkStudio codebase.
It focuses on where behavior lives today, how data moves through the app, and
which files are the first places to inspect when something changes.

## 🏗️ Architectural Shape

MarkStudio is currently a single-screen client-side editor.

- `src/App.tsx` owns the main editor shell, high-level UI state, import/export
  actions, theme switching, keyboard shortcuts, and the connection to Tiptap.
- `src/components/FloatingToolbar.tsx` owns the bottom dock UI, prompt panels,
  and the reusable control surface around the editor.
- `src/editor/storage.ts` owns local persistence helpers for the document and
  theme preference.
- `src/editor/transfer.ts` owns the external file contract and browser download
  behavior for import/export.
- `src/editor/toolbarViewport.ts` owns layout helpers that keep the caret from
  disappearing behind the floating toolbar.
- `src/editor/extensions/math.ts` owns the custom inline and block math nodes.

The app is intentionally small and explicit. There is no global store yet, and
most behavior is still coordinated directly in `App.tsx`.

## 🖼️ Layout & Shell Structure

The app's visual structure is built upon clear HTML and CSS layers:

- **`.app-shell`**: The foundational container enforcing `min-height: 100vh` and comfortable vertical padding (`padding: 2rem 0 8rem`).
- **`.editor-layout`**: Spans `width: 100%` and uses automatic horizontal margins (`margin: 0 auto`) to form the primary column housing the header and editor.
- **`.editor-chrome`**: The sticky header (`position: sticky; top: 2rem; z-index: 50`). It uses a flex layout to separate the title and the `.editor-tools` container. It stacks vertically on screens smaller than 820px.
- **`.editor-tools` & `.editor-action`**: Groups import/export buttons styled with pill shapes (`border-radius: 999px`) and frosted glass (`backdrop-filter: blur(18px)`).
- **`.editor-status`**: Managed via `.editor-tools-wrap`, providing transient feedback on transfer actions (auto-dismissed after 3.5s).

## 📄 Document Lifecycle

The canonical document model is Tiptap `JSONContent`.

1. `createInitialContent()` reads the last saved JSON from `localStorage`.
2. `useEditor(...)` hydrates Tiptap with that JSON or with an empty `doc`.
3. `onUpdate` writes the latest editor JSON back to `localStorage`.
4. Export wraps the current editor JSON in a versioned MarkStudio envelope.
5. Import parses and validates that envelope before replacing editor content.

This split is important:

- `storage.ts` is for local app continuity.
- `transfer.ts` is for portable files that can be re-imported later.

If the document contract changes in the future, update `transfer.ts` first and
keep version checks explicit.

## 🎛️ UI State Ownership

`App.tsx` currently owns several state groups:

- theme: persisted preference for light/dark mode
- active prompt: which toolbar panel is open
- prompt drafts: temporary form state for links, images, and math
- transfer status: short-lived feedback for import/export actions (dismisses automatically using `TRANSFER_STATUS_VISIBLE_MS`)
- toolbar clearance: spacing used to keep the editor visible above the dock

This is still manageable because the app is small. If the editor shell grows,
the first likely extraction points are:

- transfer/import-export behavior
- prompt state and prompt actions
- editor shell chrome state

## 🔄 Import and Export Flow

The import/export contract lives in `src/editor/transfer.ts` and `src/App.tsx`.

- **Export**: `exportDocument()` gets the current document via `editor.getJSON()`, calls `createExportedDocument(...)` to build the versioned file payload, then `downloadExportedDocument(...)` converts it to JSON, creates a timestamped filename, and uses a hidden `<a>` Blob URL to trigger download.
- **Import**: A hidden `<input type="file">` handles file selection, triggered by the Import UI button. The text content goes to `parseImportedDocument(...)` for strict validation.
- **Domain Errors**: The parser throws a `DocumentImportError` (e.g., `'invalid-json'`, `'invalid-document'`, `'unsupported-format'`, `'unsupported-version'`). `App.tsx` translates these to friendly messages via `getImportErrorMessage()`.
- **Confirmation and Rehydration**: A valid payload halts to ask the user to confirm replacement of their current session. Upon confirmation, it rehydrates the editor with `editor.commands.setContent()` and syncs to `localStorage` via `writeEditorContent()`.

The current file extension is plain `.json`, but the payload still carries
`kind` and `version` so the app can distinguish MarkStudio files from generic
JSON files.

## 🛠️ Maintenance Notes

- Keep comments sparse. Add them only when a function hides intent, not when the
  code is already self-explanatory.
- Prefer preserving the editor-first shape instead of introducing dashboard or
  panel abstractions.
- When editing import/export behavior, update all three layers together:
  production code, tests, and docs.
- When adding a new custom node, review both persistence and import/export, not
  only rendering.
- When changing toolbar or viewport behavior, test keyboard-driven editing, not
  only pointer interactions.

## 🔍 Files to Check First

When a bug report mentions one of these areas, start here:

- document not restoring: `src/editor/storage.ts`, `src/App.tsx`
- exported file incorrect: `src/editor/transfer.ts`, `src/App.tsx`
- import rejects valid file: `src/editor/transfer.ts`, `src/App.tsx`
- toolbar covers the caret: `src/editor/toolbarViewport.ts`, `src/App.tsx`
- math rendering issue: `src/editor/extensions/math.ts`
- shortcut or prompt issue: `src/App.tsx`, `src/components/FloatingToolbar.tsx`
