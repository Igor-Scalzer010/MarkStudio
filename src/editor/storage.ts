import type { JSONContent } from '@tiptap/core'

export type Theme = 'dark' | 'light'

export const STORAGE_KEYS = {
  content: 'markstudio.editor-content',
  theme: 'markstudio.editor-theme',
} as const

export const createEmptyDocument = (): JSONContent => ({
  content: [
    {
      type: 'paragraph',
    },
  ],
  type: 'doc',
})

const isDocumentContent = (value: unknown): value is JSONContent => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as { type?: unknown }

  return candidate.type === 'doc'
}

export const readStoredEditorContent = (): JSONContent | null => {
  try {
    const storedValue = localStorage.getItem(STORAGE_KEYS.content)

    if (!storedValue) {
      return null
    }

    const parsedValue = JSON.parse(storedValue) as unknown

    return isDocumentContent(parsedValue) ? parsedValue : null
  } catch {
    return null
  }
}

export const writeEditorContent = (content: JSONContent): void => {
  localStorage.setItem(STORAGE_KEYS.content, JSON.stringify(content))
}

export const readStoredTheme = (): Theme | null => {
  const storedTheme = localStorage.getItem(STORAGE_KEYS.theme)

  if (storedTheme === 'dark' || storedTheme === 'light') {
    return storedTheme
  }

  return null
}

export const writeTheme = (theme: Theme): void => {
  localStorage.setItem(STORAGE_KEYS.theme, theme)
}
