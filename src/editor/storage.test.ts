import {
  createEmptyDocument,
  readStoredEditorContent,
  readStoredTheme,
  STORAGE_KEYS,
  writeEditorContent,
  writeTheme,
} from './storage'

describe('storage', () => {
  it('returns null for invalid stored editor content', () => {
    localStorage.setItem(STORAGE_KEYS.content, '{"type":"paragraph"}')

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
})
