import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Editor } from '@tiptap/react'
import type { ComponentProps } from 'react'
import { vi } from 'vitest'
import { FloatingToolbar } from './FloatingToolbar'

// The toolbar only reads `isActive`, so a tiny Editor stub keeps these tests
// resilient without recreating the full Tiptap surface.
const createEditorMock = (activeKeys: string[] = []) =>
  ({
    isActive: vi.fn((name: string, attrs?: { level?: number }) => {
      if (name === 'heading' && attrs?.level) {
        return activeKeys.includes(`heading:${attrs.level}`)
      }

      return activeKeys.includes(name)
    }),
  }) as unknown as Editor

// Centralize the verbose prop surface so each test can focus on one toolbar contract.
const createProps = (overrides: Partial<ComponentProps<typeof FloatingToolbar>> = {}) => ({
  activePrompt: null,
  editor: createEditorMock(),
  imageDraft: { alt: '', url: '' },
  linkDraft: { label: '', url: '' },
  mathDraft: { displayMode: 'inline' as const, formula: '' },
  onApplyImage: vi.fn(),
  onApplyLink: vi.fn(),
  onApplyMath: vi.fn(),
  onClosePrompt: vi.fn(),
  onFocusEditor: vi.fn(),
  onImageDraftChange: vi.fn(),
  onLinkDraftChange: vi.fn(),
  onMathDraftChange: vi.fn(),
  onOpenHelp: vi.fn(),
  onOpenImage: vi.fn(),
  onOpenLink: vi.fn(),
  onOpenMath: vi.fn(),
  onToggleBulletList: vi.fn(),
  onToggleHeading: vi.fn(),
  onToggleOrderedList: vi.fn(),
  shellRef: { current: null },
  ...overrides,
})

describe('FloatingToolbar', () => {
  it('renders each prompt variant when activated', () => {
    const { rerender } = render(<FloatingToolbar {...createProps({ activePrompt: 'link' })} />)

    expect(screen.getByRole('heading', { name: 'Insert link' })).toBeInTheDocument()

    rerender(<FloatingToolbar {...createProps({ activePrompt: 'image' })} />)
    expect(screen.getByRole('heading', { name: 'Insert image' })).toBeInTheDocument()

    rerender(<FloatingToolbar {...createProps({ activePrompt: 'math' })} />)
    expect(screen.getByRole('heading', { name: 'Insert math' })).toBeInTheDocument()

    rerender(<FloatingToolbar {...createProps({ activePrompt: 'help' })} />)
    expect(screen.getByRole('heading', { name: 'Shortcuts' })).toBeInTheDocument()
  })

  it('submits the link form and refocuses the editor', () => {
    const props = createProps({
      activePrompt: 'link',
      linkDraft: { label: 'Docs', url: 'https://example.com' },
    })

    render(<FloatingToolbar {...props} />)

    // Submit through the form element so the test covers keyboard submit and button submit equally.
    fireEvent.submit(screen.getByRole('heading', { name: 'Insert link' }).closest('section')!.querySelector('form')!)

    expect(props.onApplyLink).toHaveBeenCalledTimes(1)
    expect(props.onFocusEditor).toHaveBeenCalledTimes(1)
  })

  it('submits the image form and refocuses the editor', () => {
    const props = createProps({
      activePrompt: 'image',
      imageDraft: { alt: 'Desk', url: 'https://example.com/photo.jpg' },
    })

    render(<FloatingToolbar {...props} />)

    fireEvent.submit(screen.getByRole('heading', { name: 'Insert image' }).closest('section')!.querySelector('form')!)

    expect(props.onApplyImage).toHaveBeenCalledTimes(1)
    expect(props.onFocusEditor).toHaveBeenCalledTimes(1)
  })

  it('submits the math form and refocuses the editor', () => {
    const props = createProps({
      activePrompt: 'math',
      mathDraft: { displayMode: 'block', formula: 'x^2' },
    })

    render(<FloatingToolbar {...props} />)

    fireEvent.submit(screen.getByRole('heading', { name: 'Insert math' }).closest('section')!.querySelector('form')!)

    expect(props.onApplyMath).toHaveBeenCalledTimes(1)
    expect(props.onFocusEditor).toHaveBeenCalledTimes(1)
  })

  it('closes prompt panels from the close button', async () => {
    const props = createProps({ activePrompt: 'image' })

    render(<FloatingToolbar {...props} />)

    await userEvent.click(screen.getByRole('button', { name: 'Close panel' }))

    expect(props.onClosePrompt).toHaveBeenCalledTimes(1)
  })

  it('disables editor-dependent dock buttons when the editor is unavailable', () => {
    render(<FloatingToolbar {...createProps({ editor: null })} />)

    expect(screen.getByRole('button', { name: 'H1' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Image' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Math' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Shortcuts' })).toBeEnabled()
  })

  it('reflects editor active state on pressed toolbar buttons', () => {
    render(
      <FloatingToolbar
        {...createProps({
          editor: createEditorMock(['heading:1', 'bulletList', 'inlineMath']),
        })}
      />,
    )

    expect(screen.getByRole('button', { name: 'H1' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Bullets' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Math' })).toHaveAttribute('aria-pressed', 'true')
  })
})
