import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

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

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.useRealTimers()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})
