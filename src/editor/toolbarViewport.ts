const TOOLBAR_BASE_BOTTOM = 16
const TOOLBAR_CLEARANCE_GUTTER = 24
const TOOLBAR_VIEWPORT_GUTTER = 40

export const resolveToolbarClearance = (toolbarHeight: number): number =>
  Math.ceil(toolbarHeight + TOOLBAR_BASE_BOTTOM + TOOLBAR_CLEARANCE_GUTTER)

export const resolveViewportScrollDelta = ({
  editorFocused,
  selectionBottom,
  toolbarTop,
}: {
  editorFocused: boolean
  selectionBottom: number | null
  toolbarTop: number
}): number => {
  if (!editorFocused || selectionBottom === null || !Number.isFinite(selectionBottom)) {
    return 0
  }

  const safeSelectionBottom = toolbarTop - TOOLBAR_VIEWPORT_GUTTER
  const overlap = selectionBottom - safeSelectionBottom

  if (overlap <= 0) {
    return 0
  }

  return Math.ceil(overlap)
}
