import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Mock canvas-confetti for jsdom
vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}))

// Mock global fetch by default in test environment so tests never hit production Cloudflare workers
globalThis.fetch = vi.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ success: true, data: [] }),
    text: () => Promise.resolve(JSON.stringify({ success: true, data: [] })),
  })
)
