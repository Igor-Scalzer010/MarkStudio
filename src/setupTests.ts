import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

const createEmptyRectList = () => {
  const rects: DOMRect[] = []

  return {
    item: () => null,
    length: 0,
    [Symbol.iterator]: () => rects[Symbol.iterator](),
  } as DOMRectList
}

Object.defineProperty(window, 'scrollBy', {
  configurable: true,
  value: vi.fn(),
  writable: true,
})

Object.defineProperty(URL, 'createObjectURL', {
  configurable: true,
  value: vi.fn(() => 'blob:markstudio'),
  writable: true,
})

Object.defineProperty(URL, 'revokeObjectURL', {
  configurable: true,
  value: vi.fn(),
  writable: true,
})

// ProseMirror measures selections during commands like `focus().toggleBlockquote()`.
// JSDOM does not implement these geometry APIs, so provide inert rectangles to keep
// editor behavior testable without pretending to have a real layout engine.
if (!HTMLElement.prototype.getClientRects) {
  Object.defineProperty(HTMLElement.prototype, 'getClientRects', {
    configurable: true,
    value: () => createEmptyRectList(),
  })
}

if (!Range.prototype.getClientRects) {
  Object.defineProperty(Range.prototype, 'getClientRects', {
    configurable: true,
    value: () => createEmptyRectList(),
  })
}

if (!Range.prototype.getBoundingClientRect) {
  Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: () => new DOMRect(),
  })
}

afterEach(() => {
  cleanup()
  localStorage.clear()
  // Some tests use fake timers for transient UI state; always reset them here
  // so later editor tests don't inherit a stalled clock.
  vi.useRealTimers()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})
