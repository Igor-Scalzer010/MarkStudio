import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { STORAGE_KEYS } from './editor/storage'
import {
  resolveToolbarClearance,
  resolveViewportScrollDelta,
} from './editor/toolbarViewport'

describe('App', () => {
  it('renders the live editor shell and floating toolbar', async () => {
    render(<App />)

    expect(await screen.findByLabelText('Live editor')).toBeInTheDocument()
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
