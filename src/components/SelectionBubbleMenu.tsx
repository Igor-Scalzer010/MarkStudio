import type { Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'

type SelectionBubbleMenuProps = {
  editor: Editor
  isPromptOpen: boolean
  onToggleBlockquote: () => void
}

type SelectionAction = {
  active: boolean
  label: string
  onClick: () => void
}

export const SelectionBubbleMenu = ({
  editor,
  isPromptOpen,
  onToggleBlockquote,
}: SelectionBubbleMenuProps) => {
  const actions: SelectionAction[] = [
    {
      active: editor.isActive('blockquote'),
      label: 'Blockquote',
      onClick: onToggleBlockquote,
    },
  ]

  return (
    <BubbleMenu
      className="selection-bubble"
      editor={editor}
      options={{
        offset: 14,
        placement: 'top',
      }}
      shouldShow={({ editor: activeEditor, from, state, view, to }) => {
        if (isPromptOpen || !view.hasFocus()) {
          return false
        }

        if (state.selection.empty || !activeEditor.isEditable) {
          return false
        }

        return state.doc.textBetween(from, to, ' ').trim().length > 0
      }}
      updateDelay={0}
    >
      <div aria-label="Selection formatting" className="selection-bubble__surface" role="toolbar">
        {actions.map((action) => (
          <button
            aria-pressed={action.active}
            className={`selection-bubble__button${action.active ? ' is-active' : ''}`}
            key={action.label}
            onClick={action.onClick}
            onMouseDown={(event) => {
              // Keep focus in the editor so the menu does not disappear before the command runs.
              event.preventDefault()
            }}
            type="button"
          >
            {action.label}
          </button>
        ))}
      </div>
    </BubbleMenu>
  )
}
