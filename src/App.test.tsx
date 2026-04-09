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

describe('App', () => {
  it('renders the live editor shell and floating toolbar', async () => {
    render(<App />)

    expect(await screen.findByLabelText('Live editor')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Import document' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export document' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'H1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Image' })).toBeInTheDocument()
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

  it('opens the shortcut help from the keyboard', async () => {
    render(<App />)

    const editor = await screen.findByLabelText('Live editor')

    fireEvent.focus(editor)
    fireEvent.keyDown(window, { ctrlKey: true, key: '/' })

    expect(await screen.findByText('Open this help')).toBeInTheDocument()
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

  it('exports the current document as a JSON file', async () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: 'Export document' }))

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:markstudio')
    expect(screen.getByRole('status')).toHaveTextContent(
      /\.json$/,
    )
  })

  it('hides the export status after 3.5 seconds', async () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: 'Export document' }))

    expect(screen.getByRole('status')).toHaveTextContent('Document exported as')

    await waitForElementToBeRemoved(() => screen.queryByRole('status'), {
      timeout: 4500,
    })
  }, 7000)

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
    const file = new File(
      [
        JSON.stringify({
          document: importedDocument,
          exportedAt: '2026-04-08T14:30:45.000Z',
          kind: EXPORTED_DOCUMENT_KIND,
          version: EXPORTED_DOCUMENT_VERSION,
        }),
      ],
      'draft.json',
      { type: 'application/json' },
    )

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

  it('hides the import status after 3.5 seconds', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<App />)

    const file = new File(
      [
        JSON.stringify({
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
        }),
      ],
      'draft.json',
      { type: 'application/json' },
    )

    await userEvent.upload(screen.getByTestId('import-document-input'), file)

    expect(screen.getByRole('status')).toHaveTextContent('Document imported.')

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

    const file = new File(
      [
        JSON.stringify({
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
        }),
      ],
      'draft.json',
      { type: 'application/json' },
    )

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
