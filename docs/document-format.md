# 📄 MarkStudio Document Format

This document describes the current external file contract used by MarkStudio import and export.

## 🎯 Purpose

The format is designed for lossless reconstruction of a MarkStudio document. It is not intended to be a general Markdown interchange format.

## 📁 File Type

- Extension: `.json`
- MIME type: `application/json`
- Canonical payload source: Tiptap `JSONContent`

## 📦 Payload Shape (`ExportedDocumentV1`)

```json
{
  "kind": "markstudio-document",
  "version": 1,
  "exportedAt": "2026-04-08T14:30:45.000Z",
  "document": {
    "type": "doc",
    "content": [
      {
        "type": "paragraph"
      }
    ]
  }
}
```

## 🏷️ Field Semantics

- `kind`: identifies the file as a MarkStudio document. Must be exactly `"markstudio-document"`.
- `version`: payload schema version. The current implementation supports only `1`.
- `exportedAt`: ISO timestamp of when the export occurred, used for traceability and generating human-readable filenames (e.g., `markstudio-20231025-143000.json`).
- `document`: the full Tiptap JSON document containing the editor's state.

## 📥 Import Rules & Error Handling

MarkStudio strictly validates incoming files using `parseImportedDocument()`. It accepts a file only when:

- The JSON parses successfully (otherwise throws `invalid-json`).
- `kind === "markstudio-document"` (otherwise throws `unsupported-format`).
- `version === 1` (otherwise throws `unsupported-version`).
- `document` exists and `document.type === "doc"` (otherwise throws `invalid-document`).

These errors are wrapped in a `DocumentImportError` class and caught by the UI, which maps the codes into friendly, auto-dismissible messages for the user. Files that fail these checks are rejected before any editor state is replaced.

## ✅ Current Guarantees

- Export is lossless for the document structures the app currently supports.
- Re-import restores the editor content exactly as MarkStudio stored it.
- Theme preference is not part of the document file.
- Import asks for confirmation before replacing the current draft.

## ⚠️ Current Limitations

- Images are stored by public URL only. The exported file does not package image binaries.
- The format is for MarkStudio continuity, not third-party interoperability.
- Unsupported future versions are rejected rather than partially loaded.

## 🔄 Compatibility Notes

When the document contract changes in the future, increment `version` and keep import validation explicit. Do not silently reinterpret older or unknown payloads.
