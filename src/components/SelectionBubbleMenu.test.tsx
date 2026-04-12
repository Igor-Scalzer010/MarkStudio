import { createEvent, fireEvent, render, screen } from '@testing-library/react'
import type { Editor } from '@tiptap/react'
import { vi } from 'vitest'
import { SelectionBubbleMenu } from './SelectionBubbleMenu'

const { bubbleMenuPropsSpy } = vi.hoisted(() => ({
  bubbleMenuPropsSpy: vi.fn(),
}))

vi.mock('@tiptap/react/menus', () => ({
  BubbleMenu: (props: {
    children: React.ReactNode
    [key: string]: unknown
  }) => {
    bubbleMenuPropsSpy(props)

    return <div data-testid="bubble-menu">{props.children}</div>
  },
}))

type ShouldShowArgs = {
  editor: { isEditable: boolean }
  from: number
  state: {
    doc: { textBetween: (from: number, to: number, blockSeparator?: string) => string }
    selection: { empty: boolean }
  }
  to: number
  view: { hasFocus: () => boolean }
}

// The component only depends on `isActive` from the editor instance, so the
// tests keep the stub deliberately small.
const createEditorMock = (activeKeys: string[] = []) =>
  ({
    isActive: vi.fn((name: string) => activeKeys.includes(name)),
  }) as unknown as Editor

const getShouldShow = (): ((args: ShouldShowArgs) => boolean) =>
  bubbleMenuPropsSpy.mock.calls.at(-1)?.[0].shouldShow

const createShouldShowArgs = (
  overrides: Partial<ShouldShowArgs> = {},
): ShouldShowArgs => ({
  editor: { isEditable: true },
  from: 1,
  state: {
    doc: {
      textBetween: () => 'Quoted text',
    },
    selection: { empty: false },
  },
  to: 12,
  view: { hasFocus: () => true },
  ...overrides,
})

describe('SelectionBubbleMenu', () => {
  it('renders the blockquote action and reflects the active editor state', () => {
    render(
      <SelectionBubbleMenu
        editor={createEditorMock(['blockquote'])}
        isPromptOpen={false}
        onToggleBlockquote={vi.fn()}
      />,
    )

    expect(screen.getByRole('toolbar', { name: 'Selection formatting' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Blockquote' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('keeps editor focus stable while running the blockquote action', () => {
    const onToggleBlockquote = vi.fn()

    render(
      <SelectionBubbleMenu
        editor={createEditorMock()}
        isPromptOpen={false}
        onToggleBlockquote={onToggleBlockquote}
      />,
    )

    const button = screen.getByRole('button', { name: 'Blockquote' })
    const mouseDownEvent = createEvent.mouseDown(button)
    fireEvent(button, mouseDownEvent)
    fireEvent.click(button)

    expect(mouseDownEvent.defaultPrevented).toBe(true)
    expect(onToggleBlockquote).toHaveBeenCalledTimes(1)
  })

  it('only requests the bubble when the editor has a focused non-empty text selection', () => {
    render(
      <SelectionBubbleMenu
        editor={createEditorMock()}
        isPromptOpen={false}
        onToggleBlockquote={vi.fn()}
      />,
    )

    const shouldShow = getShouldShow()

    expect(
      shouldShow(
        createShouldShowArgs({
          state: {
            doc: { textBetween: () => '   ' },
            selection: { empty: false },
          },
        }),
      ),
    ).toBe(false)
    expect(
      shouldShow(
        createShouldShowArgs({
          state: {
            doc: { textBetween: () => 'Quoted text' },
            selection: { empty: true },
          },
        }),
      ),
    ).toBe(false)
    expect(
      shouldShow(
        createShouldShowArgs({
          editor: { isEditable: false },
        }),
      ),
    ).toBe(false)
    expect(
      shouldShow(
        createShouldShowArgs({
          view: { hasFocus: () => false },
        }),
      ),
    ).toBe(false)
    expect(shouldShow(createShouldShowArgs())).toBe(true)
  })

  it('suppresses the bubble while another prompt is open', () => {
    render(
      <SelectionBubbleMenu
        editor={createEditorMock()}
        isPromptOpen
        onToggleBlockquote={vi.fn()}
      />,
    )

    const shouldShow = getShouldShow()

    expect(shouldShow(createShouldShowArgs())).toBe(false)
  })
})
