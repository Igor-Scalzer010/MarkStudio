import type { Editor } from '@tiptap/react'
import type { Dispatch, RefObject, SetStateAction } from 'react'

type PromptKind = 'help' | 'image' | 'link' | 'math'

type LinkDraft = {
  label: string
  url: string
}

type ImageDraft = {
  alt: string
  url: string
}

type MathDraft = {
  displayMode: 'block' | 'inline'
  formula: string
}

type ToolbarButtonProps = {
  active?: boolean
  disabled?: boolean
  label: string
  onClick: () => void
  pressed?: boolean
  variant?: 'default' | 'ghost' | 'primary'
}

type FloatingToolbarProps = {
  activePrompt: PromptKind | null
  editor: Editor | null
  imageDraft: ImageDraft
  linkDraft: LinkDraft
  mathDraft: MathDraft
  onApplyImage: () => void
  onApplyLink: () => void
  onApplyMath: () => void
  onClosePrompt: () => void
  onFocusEditor: () => void
  onImageDraftChange: Dispatch<SetStateAction<ImageDraft>>
  onLinkDraftChange: Dispatch<SetStateAction<LinkDraft>>
  onMathDraftChange: Dispatch<SetStateAction<MathDraft>>
  onOpenHelp: () => void
  onOpenImage: () => void
  onOpenLink: () => void
  onOpenMath: () => void
  onToggleBulletList: () => void
  onToggleHeading: (level: 1 | 2 | 3) => void
  onToggleOrderedList: () => void
  shellRef: RefObject<HTMLDivElement | null>
}

const ToolbarButton = ({
  active = false,
  disabled = false,
  label,
  onClick,
  pressed = false,
  variant = 'default',
}: ToolbarButtonProps) => {
  const classes = ['toolbar-button']

  if (variant === 'ghost') {
    classes.push('toolbar-button--ghost')
  }

  if (variant === 'primary') {
    classes.push('is-primary')
  }

  if (active) {
    classes.push('is-active')
  }

  return (
    <button
      aria-pressed={pressed}
      className={classes.join(' ')}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  )
}

export const FloatingToolbar = ({
  activePrompt,
  editor,
  imageDraft,
  linkDraft,
  mathDraft,
  onApplyImage,
  onApplyLink,
  onApplyMath,
  onClosePrompt,
  onFocusEditor,
  onImageDraftChange,
  onLinkDraftChange,
  onMathDraftChange,
  onOpenHelp,
  onOpenImage,
  onOpenLink,
  onOpenMath,
  onToggleBulletList,
  onToggleHeading,
  onToggleOrderedList,
  shellRef,
}: FloatingToolbarProps) => {
  const isDisabled = !editor

  return (
    <div className="toolbar-shell" ref={shellRef}>
      {activePrompt === 'link' ? (
        <section className="toolbar-panel" aria-label="Link options">
          <div className="toolbar-panel__header">
            <div>
              <h2 className="toolbar-panel__title">Insert link</h2>
              <p className="toolbar-panel__subtitle">
                Paste the URL. If no text is selected, the URL becomes the label.
              </p>
            </div>
            <button
              aria-label="Close panel"
              className="toolbar-close"
              onClick={onClosePrompt}
              type="button"
            >
              Close
            </button>
          </div>

          <form
            className="toolbar-form"
            onSubmit={(event) => {
              event.preventDefault()
              onApplyLink()
              onFocusEditor()
            }}
          >
            <div className="toolbar-form__row toolbar-form__row--split">
              <div className="toolbar-field">
                <label htmlFor="link-url">URL</label>
                <input
                  autoFocus
                  id="link-url"
                  onChange={(event) =>
                    onLinkDraftChange((currentDraft) => ({
                      ...currentDraft,
                      url: event.target.value,
                    }))
                  }
                  placeholder="https://example.com"
                  value={linkDraft.url}
                />
              </div>
              <div className="toolbar-field">
                <label htmlFor="link-label">Label</label>
                <input
                  id="link-label"
                  onChange={(event) =>
                    onLinkDraftChange((currentDraft) => ({
                      ...currentDraft,
                      label: event.target.value,
                    }))
                  }
                  placeholder="Optional when text is selected"
                  value={linkDraft.label}
                />
              </div>
            </div>

            <div className="toolbar-form__actions">
              <ToolbarButton label="Cancel" onClick={onClosePrompt} variant="ghost" />
              <ToolbarButton label="Apply link" onClick={onApplyLink} variant="primary" />
            </div>
          </form>
        </section>
      ) : null}

      {activePrompt === 'image' ? (
        <section className="toolbar-panel" aria-label="Image options">
          <div className="toolbar-panel__header">
            <div>
              <h2 className="toolbar-panel__title">Insert image</h2>
              <p className="toolbar-panel__subtitle">
                Images in v1 use public URLs so the editor stays local-first.
              </p>
            </div>
            <button
              aria-label="Close panel"
              className="toolbar-close"
              onClick={onClosePrompt}
              type="button"
            >
              Close
            </button>
          </div>

          <form
            className="toolbar-form"
            onSubmit={(event) => {
              event.preventDefault()
              onApplyImage()
              onFocusEditor()
            }}
          >
            <div className="toolbar-field">
              <label htmlFor="image-url">Image URL</label>
              <input
                autoFocus
                id="image-url"
                onChange={(event) =>
                  onImageDraftChange((currentDraft) => ({
                    ...currentDraft,
                    url: event.target.value,
                  }))
                }
                placeholder="https://images.example.com/photo.jpg"
                value={imageDraft.url}
              />
            </div>
            <div className="toolbar-field">
              <label htmlFor="image-alt">Alt text</label>
              <input
                id="image-alt"
                onChange={(event) =>
                  onImageDraftChange((currentDraft) => ({
                    ...currentDraft,
                    alt: event.target.value,
                  }))
                }
                placeholder="What should screen readers read?"
                value={imageDraft.alt}
              />
            </div>

            <div className="toolbar-form__actions">
              <ToolbarButton label="Cancel" onClick={onClosePrompt} variant="ghost" />
              <ToolbarButton label="Insert image" onClick={onApplyImage} variant="primary" />
            </div>
          </form>
        </section>
      ) : null}

      {activePrompt === 'math' ? (
        <section className="toolbar-panel" aria-label="Math options">
          <div className="toolbar-panel__header">
            <div>
              <h2 className="toolbar-panel__title">Insert math</h2>
              <p className="toolbar-panel__subtitle">
                Use inline math for formulas inside text and block math for standalone equations.
              </p>
            </div>
            <button
              aria-label="Close panel"
              className="toolbar-close"
              onClick={onClosePrompt}
              type="button"
            >
              Close
            </button>
          </div>

          <form
            className="toolbar-form"
            onSubmit={(event) => {
              event.preventDefault()
              onApplyMath()
              onFocusEditor()
            }}
          >
            <div className="toolbar-field">
              <span className="toolbar-shortcuts__hint">Mode</span>
              <div className="toolbar-segmented" role="group" aria-label="Math mode">
                <button
                  className={mathDraft.displayMode === 'inline' ? 'is-active' : undefined}
                  onClick={() =>
                    onMathDraftChange((currentDraft) => ({
                      ...currentDraft,
                      displayMode: 'inline',
                    }))
                  }
                  type="button"
                >
                  Inline
                </button>
                <button
                  className={mathDraft.displayMode === 'block' ? 'is-active' : undefined}
                  onClick={() =>
                    onMathDraftChange((currentDraft) => ({
                      ...currentDraft,
                      displayMode: 'block',
                    }))
                  }
                  type="button"
                >
                  Block
                </button>
              </div>
            </div>

            <div className="toolbar-field">
              <label htmlFor="math-formula">Formula</label>
              <input
                autoFocus
                id="math-formula"
                onChange={(event) =>
                  onMathDraftChange((currentDraft) => ({
                    ...currentDraft,
                    formula: event.target.value,
                  }))
                }
                placeholder="e.g. \\sqrt{a^2 + b^2}"
                value={mathDraft.formula}
              />
            </div>

            <div className="toolbar-form__actions">
              <ToolbarButton label="Cancel" onClick={onClosePrompt} variant="ghost" />
              <ToolbarButton label="Insert math" onClick={onApplyMath} variant="primary" />
            </div>
          </form>
        </section>
      ) : null}

      {activePrompt === 'help' ? (
        <section className="toolbar-panel" aria-label="Shortcut help">
          <div className="toolbar-panel__header">
            <div>
              <h2 className="toolbar-panel__title">Shortcuts</h2>
              <p className="toolbar-panel__subtitle">
                Use the dock when you want control. Use shortcuts when you want speed.
              </p>
            </div>
            <button
              aria-label="Close panel"
              className="toolbar-close"
              onClick={onClosePrompt}
              type="button"
            >
              Close
            </button>
          </div>

          <div className="toolbar-shortcuts">
            <ul>
              <li>
                <span>Bold</span>
                <code>Ctrl/Cmd + B</code>
              </li>
              <li>
                <span>Italic</span>
                <code>Ctrl/Cmd + I</code>
              </li>
              <li>
                <span>Link</span>
                <code>Ctrl/Cmd + H</code>
              </li>
              <li>
                <span>Fallback link shortcut</span>
                <code>Ctrl/Cmd + Shift + K</code>
              </li>
              <li>
                <span>Math</span>
                <code>Ctrl/Cmd + M</code>
              </li>
              <li>
                <span>Image by URL</span>
                <code>Ctrl/Cmd + Shift + I</code>
              </li>
              <li>
                <span>Heading levels 1-3</span>
                <code>Ctrl/Cmd + Alt + 1/2/3</code>
              </li>
              <li>
                <span>Ordered list</span>
                <code>Ctrl/Cmd + Shift + 7</code>
              </li>
              <li>
                <span>Bullet list</span>
                <code>Ctrl/Cmd + Shift + 8</code>
              </li>
              <li>
                <span>Open this help</span>
                <code>Ctrl/Cmd + /</code>
              </li>
            </ul>
          </div>
        </section>
      ) : null}

      <section className="toolbar-dock" aria-label="Editing toolbar">
        <div className="toolbar-groups">
          <div className="toolbar-group">
            <ToolbarButton
              active={editor?.isActive('heading', { level: 1 }) ?? false}
              disabled={isDisabled}
              label="H1"
              onClick={() => onToggleHeading(1)}
              pressed={editor?.isActive('heading', { level: 1 }) ?? false}
            />
            <ToolbarButton
              active={editor?.isActive('heading', { level: 2 }) ?? false}
              disabled={isDisabled}
              label="H2"
              onClick={() => onToggleHeading(2)}
              pressed={editor?.isActive('heading', { level: 2 }) ?? false}
            />
            <ToolbarButton
              active={editor?.isActive('heading', { level: 3 }) ?? false}
              disabled={isDisabled}
              label="H3"
              onClick={() => onToggleHeading(3)}
              pressed={editor?.isActive('heading', { level: 3 }) ?? false}
            />
          </div>

          <div className="toolbar-group">
            <ToolbarButton
              active={editor?.isActive('bulletList') ?? false}
              disabled={isDisabled}
              label="Bullets"
              onClick={onToggleBulletList}
              pressed={editor?.isActive('bulletList') ?? false}
            />
            <ToolbarButton
              active={editor?.isActive('orderedList') ?? false}
              disabled={isDisabled}
              label="Numbers"
              onClick={onToggleOrderedList}
              pressed={editor?.isActive('orderedList') ?? false}
            />
          </div>

          <div className="toolbar-group">
            <ToolbarButton disabled={isDisabled} label="Link" onClick={onOpenLink} />
            <ToolbarButton disabled={isDisabled} label="Image" onClick={onOpenImage} />
            <ToolbarButton
              active={
                (editor?.isActive('inlineMath') ?? false) ||
                (editor?.isActive('blockMath') ?? false)
              }
              disabled={isDisabled}
              label="Math"
              onClick={onOpenMath}
              pressed={
                (editor?.isActive('inlineMath') ?? false) ||
                (editor?.isActive('blockMath') ?? false)
              }
            />
          </div>

          <div className="toolbar-group">
            <ToolbarButton label="Shortcuts" onClick={onOpenHelp} />
          </div>
        </div>

        <div className="toolbar-meta">
          {/* <span>Centered for long-form writing.</span> */}
          {/* <span>Bottom dock stays available when shortcuts are not enough.</span> */}
        </div>
      </section>
    </div>
  )
}
