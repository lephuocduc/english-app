import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Mock canvas-confetti for jsdom
vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}))
