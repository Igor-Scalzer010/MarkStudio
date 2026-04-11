import {
  createEmptyDocument,
  isDocumentContent,
  readStoredEditorContent,
  readStoredTheme,
  STORAGE_KEYS,
  writeEditorContent,
  writeTheme,
} from './storage'

describe('storage', () => {
  it('creates an empty document with a doc root and paragraph child', () => {
    expect(createEmptyDocument()).toEqual({
      content: [{ type: 'paragraph' }],
      type: 'doc',
    })
  })

  it('recognizes valid document content and rejects non-doc roots', () => {
    expect(
      isDocumentContent({
        content: [{ type: 'paragraph' }],
        type: 'doc',
      }),
    ).toBe(true)

    expect(
      isDocumentContent({
        content: [{ type: 'text' }],
        type: 'paragraph',
      }),
    ).toBe(false)

    expect(isDocumentContent(null)).toBe(false)
  })

  it('returns null for invalid stored editor content', () => {
    localStorage.setItem(STORAGE_KEYS.content, '{"type":"paragraph"}')

    expect(readStoredEditorContent()).toBeNull()
  })

  it('returns null for malformed JSON in stored editor content', () => {
    localStorage.setItem(STORAGE_KEYS.content, '{broken')

    expect(readStoredEditorContent()).toBeNull()
  })

  it('writes and reads a valid editor document', () => {
    const document = createEmptyDocument()

    writeEditorContent(document)

    expect(readStoredEditorContent()).toEqual(document)
  })

  it('reads and writes the theme preference', () => {
    writeTheme('dark')

    expect(readStoredTheme()).toBe('dark')
  })

  it('returns null for invalid stored themes', () => {
    localStorage.setItem(STORAGE_KEYS.theme, 'sepia')

    expect(readStoredTheme()).toBeNull()
  })
})
