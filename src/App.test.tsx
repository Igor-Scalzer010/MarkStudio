import {
  fireEvent,
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { JSONContent } from '@tiptap/core'
import { vi } from 'vitest'

// The selection bubble itself has dedicated component tests. Here we replace it
// with a thin trigger so App coverage stays focused on editor integration.
vi.mock('./components/SelectionBubbleMenu', () => ({
  SelectionBubbleMenu: ({
    onToggleBlockquote,
  }: {
    onToggleBlockquote: () => void
  }) => (
    <button
      onClick={onToggleBlockquote}
      onMouseDown={(event) => {
        event.preventDefault()
      }}
      type="button"
    >
      Blockquote
    </button>
  ),
}))

import App from './App'
import { STORAGE_KEYS } from './editor/storage'
import {
  EXPORTED_DOCUMENT_KIND,
  EXPORTED_DOCUMENT_VERSION,
} from './editor/transfer'
import {
  resolveToolbarClearance,
  resolveViewportScrollDelta,
} from './editor/toolbarViewport'

const createImportedFile = (payload: unknown, name = 'draft.json') =>
  new File([JSON.stringify(payload)], name, { type: 'application/json' })

// App resolves its initial theme outside React state, so tests need an explicit
// browser-level stub instead of driving the UI first.
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
    writable: true,
  })
}

const focusEditor = async () => {
  const editor = await screen.findByLabelText('Live editor')

  fireEvent.focus(editor)

  return editor
}

// Keyboard shortcuts are bound on `window`, but only after the editor has focus.
const openPromptWithShortcut = async (key: string, options?: { shiftKey?: boolean }) => {
  await focusEditor()
  fireEvent.keyDown(window, { ctrlKey: true, key, shiftKey: options?.shiftKey })
}

describe('App', () => {
  it('renders the live editor shell and floating toolbar', async () => {
    render(<App />)

    expect(await screen.findByLabelText('Live editor')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Import document' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export document' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'H1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Image' })).toBeInTheDocument()
  })

  it('boots with a saved document from localStorage', async () => {
    localStorage.setItem(
      STORAGE_KEYS.content,
      JSON.stringify({
        content: [
          {
            content: [{ text: 'Recovered session', type: 'text' }],
            type: 'paragraph',
          },
        ],
        type: 'doc',
      }),
    )

    render(<App />)

    expect(await screen.findByText('Recovered session')).toBeInTheDocument()
  })

  it('toggles the theme and persists the preference', async () => {
    render(<App />)

    const themeButton = screen.getByRole('button', {
      name: 'Switch to dark theme',
    })

    await userEvent.click(themeButton)

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem(STORAGE_KEYS.theme)).toBe('dark')
  })

  it('prefers the stored theme over matchMedia on boot', () => {
    localStorage.setItem(STORAGE_KEYS.theme, 'light')
    mockMatchMedia(true)

    render(<App />)

    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('falls back to matchMedia when there is no stored theme', () => {
    mockMatchMedia(true)

    render(<App />)

    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('opens the shortcut help from the keyboard', async () => {
    render(<App />)

    await focusEditor()
    fireEvent.keyDown(window, { ctrlKey: true, key: '/' })

    expect(await screen.findByText('Open this help')).toBeInTheDocument()
  })

  it('opens the link prompt with Ctrl+H', async () => {
    render(<App />)

    await openPromptWithShortcut('h')

    expect(await screen.findByRole('heading', { name: 'Insert link' })).toBeInTheDocument()
  })

  it('opens the link prompt with Ctrl+Shift+K', async () => {
    render(<App />)

    await openPromptWithShortcut('K', { shiftKey: true })

    expect(await screen.findByRole('heading', { name: 'Insert link' })).toBeInTheDocument()
  })

  it('opens the math prompt with Ctrl+M', async () => {
    render(<App />)

    await openPromptWithShortcut('m')

    expect(await screen.findByRole('heading', { name: 'Insert math' })).toBeInTheDocument()
  })

  it('opens the image prompt with Ctrl+Shift+I', async () => {
    render(<App />)

    await openPromptWithShortcut('I', { shiftKey: true })

    expect(await screen.findByRole('heading', { name: 'Insert image' })).toBeInTheDocument()
  })

  it('closes the active prompt with Escape', async () => {
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: 'Image' }))
    expect(screen.getByRole('heading', { name: 'Insert image' })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Insert image' })).not.toBeInTheDocument()
    })
  })

  it('does not trigger editor shortcuts while focus is inside prompt inputs', async () => {
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: 'Image' }))

    const imageUrlInput = screen.getByLabelText('Image URL')
    imageUrlInput.focus()
    fireEvent.keyDown(imageUrlInput, { ctrlKey: true, key: 'm' })

    expect(screen.getByRole('heading', { name: 'Insert image' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Insert math' })).not.toBeInTheDocument()
  })

  it('inserts an image node from the bottom dock and persists the document', async () => {
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: 'Image' }))

    await userEvent.type(
      screen.getByLabelText('Image URL'),
      'https://example.com/photo.jpg',
    )
    await userEvent.type(screen.getByLabelText('Alt text'), 'A calm writing desk')
    await userEvent.click(screen.getByRole('button', { name: 'Insert image' }))

    await waitFor(() => {
      const storedValue = localStorage.getItem(STORAGE_KEYS.content)

      expect(storedValue).not.toBeNull()
      expect(storedValue).toContain('"type":"image"')
      expect(storedValue).toContain('https://example.com/photo.jpg')
    })
  })

  it('keeps the image prompt open and skips persistence for invalid image URLs', async () => {
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: 'Image' }))
    await userEvent.type(screen.getByLabelText('Image URL'), 'not-a-valid-url')
    await userEvent.click(screen.getByRole('button', { name: 'Insert image' }))

    expect(screen.getByRole('heading', { name: 'Insert image' })).toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEYS.content)).toBeNull()
  })

  it('inserts inline math and persists the document', async () => {
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: 'Math' }))
    await userEvent.type(screen.getByLabelText('Formula'), 'E=mc^2')
    await userEvent.click(screen.getByRole('button', { name: 'Insert math' }))

    await waitFor(() => {
      const storedValue = localStorage.getItem(STORAGE_KEYS.content)

      expect(storedValue).not.toBeNull()
      expect(storedValue).toContain('"type":"inlineMath"')
      expect(storedValue).toContain('E=mc^2')
    })
  })

  it('inserts block math and persists the document', async () => {
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: 'Math' }))
    await userEvent.click(screen.getByRole('button', { name: 'Block' }))
    await userEvent.type(screen.getByLabelText('Formula'), 'a^2+b^2=c^2')
    await userEvent.click(screen.getByRole('button', { name: 'Insert math' }))

    await waitFor(() => {
      const storedValue = localStorage.getItem(STORAGE_KEYS.content)

      expect(storedValue).not.toBeNull()
      expect(storedValue).toContain('"type":"blockMath"')
      expect(storedValue).toContain('a^2+b^2=c^2')
    })
  })

  it('toggles blockquote formatting from the selection menu trigger and persists it', async () => {
    localStorage.setItem(
      STORAGE_KEYS.content,
      JSON.stringify({
        content: [
          {
            content: [{ text: 'Quoted draft', type: 'text' }],
            type: 'paragraph',
          },
        ],
        type: 'doc',
      }),
    )

    render(<App />)

    await focusEditor()
    await userEvent.click(await screen.findByRole('button', { name: 'Blockquote' }))

    await waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEYS.content)).toContain('"type":"blockquote"')
    })

    await userEvent.click(screen.getByRole('button', { name: 'Blockquote' }))

    await waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEYS.content)).not.toContain('"type":"blockquote"')
      expect(localStorage.getItem(STORAGE_KEYS.content)).toContain('Quoted draft')
    })
  })

  it('exports the current document as a JSON file', async () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: 'Export document' }))

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:markstudio')
    expect(screen.getByRole('status')).toHaveTextContent(/\.json$/)
  })

  it('hides the export status after 3.5 seconds', async () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: 'Export document' }))

    expect(screen.getByRole('status')).toHaveTextContent('Document exported as')

    // The status auto-dismisses via a real timeout in the component.
    await waitForElementToBeRemoved(() => screen.queryByRole('status'), {
      timeout: 4500,
    })
  }, 7000)

  it('uses a hidden import input that accepts JSON files', () => {
    render(<App />)

    expect(screen.getByTestId('import-document-input')).toHaveAttribute(
      'accept',
      '.json,application/json',
    )
  })

  it('clicking Import document triggers the hidden file input picker', async () => {
    const inputClickSpy = vi.spyOn(HTMLInputElement.prototype, 'click')

    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: 'Import document' }))

    expect(inputClickSpy).toHaveBeenCalledTimes(1)
  })

  it('imports a MarkStudio document after confirmation and persists it', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<App />)

    const importedDocument: JSONContent = {
      content: [
        {
          attrs: {
            level: 1,
          },
          content: [
            {
              text: 'Recovered draft',
              type: 'text',
            },
          ],
          type: 'heading',
        },
        {
          attrs: {
            formula: 'a^2+b^2=c^2',
          },
          type: 'blockMath',
        },
      ],
      type: 'doc',
    }
    const file = createImportedFile({
      document: importedDocument,
      exportedAt: '2026-04-08T14:30:45.000Z',
      kind: EXPORTED_DOCUMENT_KIND,
      version: EXPORTED_DOCUMENT_VERSION,
    })

    await userEvent.upload(screen.getByTestId('import-document-input'), file)

    expect(window.confirm).toHaveBeenCalledWith(
      'Importing will replace the current document. Continue?',
    )

    await waitFor(() => {
      const storedValue = localStorage.getItem(STORAGE_KEYS.content)

      expect(storedValue).not.toBeNull()
      expect(storedValue).toContain('Recovered draft')
      expect(storedValue).toContain('"type":"blockMath"')
    })

    expect(screen.getByRole('status')).toHaveTextContent('Document imported.')
  })

  it('shows an alert for malformed JSON imports', async () => {
    render(<App />)

    const file = new File(['{invalid'], 'broken.json', { type: 'application/json' })
    await userEvent.upload(screen.getByTestId('import-document-input'), file)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('The selected file is not valid JSON.')
  })

  it('shows an alert for unsupported document kinds', async () => {
    render(<App />)

    const file = createImportedFile({
      document: {
        content: [{ type: 'paragraph' }],
        type: 'doc',
      },
      exportedAt: '2026-04-08T14:30:45.000Z',
      kind: 'markdown',
      version: EXPORTED_DOCUMENT_VERSION,
    })

    await userEvent.upload(screen.getByTestId('import-document-input'), file)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('The selected file is not a MarkStudio document.')
  })

  it('shows an alert for unsupported document versions', async () => {
    render(<App />)

    const file = createImportedFile({
      document: {
        content: [{ type: 'paragraph' }],
        type: 'doc',
      },
      exportedAt: '2026-04-08T14:30:45.000Z',
      kind: EXPORTED_DOCUMENT_KIND,
      version: 2,
    })

    await userEvent.upload(screen.getByTestId('import-document-input'), file)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('This document version is not supported yet.')
  })

  it('shows an alert for invalid document roots during import', async () => {
    render(<App />)

    const file = createImportedFile({
      document: {
        content: [{ text: 'Broken root', type: 'text' }],
        type: 'paragraph',
      },
      exportedAt: '2026-04-08T14:30:45.000Z',
      kind: EXPORTED_DOCUMENT_KIND,
      version: EXPORTED_DOCUMENT_VERSION,
    })

    await userEvent.upload(screen.getByTestId('import-document-input'), file)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(
      'The selected file does not contain a valid MarkStudio document.',
    )
  })

  it('hides the import status after 3.5 seconds', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<App />)

    const file = createImportedFile({
      document: {
        content: [
          {
            content: [
              {
                text: 'Recovered draft',
                type: 'text',
              },
            ],
            type: 'paragraph',
          },
        ],
        type: 'doc',
      },
      exportedAt: '2026-04-08T14:30:45.000Z',
      kind: EXPORTED_DOCUMENT_KIND,
      version: EXPORTED_DOCUMENT_VERSION,
    })

    await userEvent.upload(screen.getByTestId('import-document-input'), file)

    expect(screen.getByRole('status')).toHaveTextContent('Document imported.')

    // This protects the transient transfer feedback contract, not just the copy.
    await waitForElementToBeRemoved(() => screen.queryByRole('status'), {
      timeout: 4500,
    })
  }, 7000)

  it('keeps the current document when import is canceled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    localStorage.setItem(
      STORAGE_KEYS.content,
      JSON.stringify({
        content: [
          {
            content: [
              {
                text: 'Current draft',
                type: 'text',
              },
            ],
            type: 'paragraph',
          },
        ],
        type: 'doc',
      }),
    )

    render(<App />)

    const file = createImportedFile({
      document: {
        content: [
          {
            content: [
              {
                text: 'Imported draft',
                type: 'text',
              },
            ],
            type: 'paragraph',
          },
        ],
        type: 'doc',
      },
      exportedAt: '2026-04-08T14:30:45.000Z',
      kind: EXPORTED_DOCUMENT_KIND,
      version: EXPORTED_DOCUMENT_VERSION,
    })

    await userEvent.upload(screen.getByTestId('import-document-input'), file)

    expect(localStorage.getItem(STORAGE_KEYS.content)).toContain('Current draft')
    expect(localStorage.getItem(STORAGE_KEYS.content)).not.toContain('Imported draft')
    expect(screen.getByRole('status')).toHaveTextContent('Import canceled.')
  })

  it('derives bottom clearance from the current toolbar height', () => {
    expect(resolveToolbarClearance(96)).toBe(136)
    expect(resolveToolbarClearance(152)).toBe(192)
  })

  it('only requests viewport scroll when the focused caret enters the toolbar safety zone', () => {
    expect(
      resolveViewportScrollDelta({
        editorFocused: true,
        selectionBottom: 498,
        toolbarTop: 520,
      }),
    ).toBe(18)

    expect(
      resolveViewportScrollDelta({
        editorFocused: true,
        selectionBottom: 470,
        toolbarTop: 520,
      }),
    ).toBe(0)

    expect(
      resolveViewportScrollDelta({
        editorFocused: false,
        selectionBottom: 498,
        toolbarTop: 520,
      }),
    ).toBe(0)
  })
})
