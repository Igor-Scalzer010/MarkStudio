![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white) ![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=flat&logo=vite&logoColor=white)

# 📝 MarkStudio

MarkStudio is evolving into a single-screen live writing editor. The current app is already editor-first: the writing surface is the product, formatting happens in place, and the UI stays minimal around the document. ✨

## 🚀 Current Product State

- **Single-screen editor** built with React 19, TypeScript 6, Vite 8, and Tiptap 3;
- **Local-first** document persistence in `localStorage`;
- **Floating bottom toolbar** for structure and insert actions;
- **Sticky top chrome** with theme toggle plus import/export controls;
- **Custom math nodes** rendered with KaTeX.

This repository is still early-stage. The codebase is intentionally small and explicit so future editor work can move quickly without carrying template-era abstractions.

## ✨ Implemented Features

### ✍️ Editing

- Paragraph writing with live formatting;
- Headings `H1` to `H3`;
- Bullet and ordered lists;
- Links with inline prompt support;
- Images by public URL;
- Inline math and block math nodes;
- Shortcut help panel and bottom dock controls.

### 💾 Document Continuity

- **Auto-save** of the current document to `localStorage`;
- **Theme preference** persistence to `localStorage`;
- **Export** of the current document as a versioned `.json` file.

## 🗂️ Data Model

MarkStudio currently uses Tiptap `JSONContent` as the canonical document model.

- **In-memory editor state**: Tiptap editor instance;
- **Local persistence**: `markstudio.editor-content` in `localStorage`;
- **Theme persistence**: `markstudio.editor-theme` in `localStorage`;
- **External file exchange**: versioned JSON payload (`ExportedDocumentV1`) for lossless reconstruction.

The current editor supports custom nodes like `inlineMath` and `blockMath`, so JSON is the format that preserves the document exactly.

The external file contract is documented in [docs/document-format.md](docs/document-format.md).

## 📥 Import and Export

MarkStudio supports exporting the current document as a versioned JSON file and importing it back to restore the session.

- For the external file contract, payload format, and limitations, see [docs/document-format.md](docs/document-format.md).
- For the UI behavior, validation flow, and state rehydration details, see [docs/code-overview.md](docs/code-overview.md).

## ⌨️ Keyboard Shortcuts

- `Ctrl/Cmd + B`: Bold
- `Ctrl/Cmd + I`: Italic
- `Ctrl/Cmd + H`: Open link prompt
- `Ctrl/Cmd + Shift + K`: Fallback link shortcut
- `Ctrl/Cmd + M`: Open math prompt
- `Ctrl/Cmd + Shift + I`: Open image prompt
- `Ctrl/Cmd + Alt + 1/2/3`: Toggle heading levels
- `Ctrl/Cmd + Shift + 7`: Ordered list
- `Ctrl/Cmd + Shift + 8`: Bullet list
- `Ctrl/Cmd + /`: Open shortcut help

## 📁 Project Structure

```mermaid
%%{init: {"flowchart": {"htmlLabels": true}}}%%
graph LR
    %% Elegant node styles
    classDef dir fill:#eef2ff,stroke:#6366f1,stroke-width:2px,color:#312e81,font-weight:bold
    classDef file fill:#f8fafc,stroke:#94a3b8,stroke-width:1px,color:#334155

    src(("src/")):::dir
    
    App_tsx("<b style='color: #0f172a;'>App.tsx</b><br><i>Main editor shell, high-level UI, and transfer logic</i>"):::file
    App_css("<b style='color: #0f172a;'>App.css</b><br><i>Editor surface, chrome, tools, and prompt styling</i>"):::file
    
    components(("components/")):::dir
    FloatingToolbar_tsx("<b style='color: #0f172a;'>FloatingToolbar.tsx</b><br><i>Bottom dock and prompt panels</i>"):::file
    
    editor(("editor/")):::dir
    storage_ts("<b style='color: #0f172a;'>storage.ts</b><br><i>Local persistence helpers</i>"):::file
    toolbarViewport_ts("<b style='color: #0f172a;'>toolbarViewport.ts</b><br><i>Toolbar clearance and viewport sync helpers</i>"):::file
    transfer_ts("<b style='color: #0f172a;'>transfer.ts</b><br><i>Export/import payload definition, parsing, and browser download</i>"):::file
    
    extensions(("extensions/")):::dir
    math_ts("<b style='color: #0f172a;'>math.ts</b><br><i>Inline and block math nodes with KaTeX rendering</i>"):::file

    src --> App_tsx
    src --> App_css
    src --> components
    src --> editor
    
    components --> FloatingToolbar_tsx
    
    editor --> storage_ts
    editor --> toolbarViewport_ts
    editor --> transfer_ts
    editor --> extensions
    
    extensions --> math_ts
```

## 🛠️ Development

Install dependencies:
```bash
npm install
```

Start the app:
```bash
npm run dev
```

Quality checks:
```bash
npm run test
npm run lint
npm run build
```

📖 Documentation for the export/import contract lives in [docs/document-format.md](docs/document-format.md).
🗺️ An implementation-oriented map of the codebase lives in [docs/code-overview.md](docs/code-overview.md).
