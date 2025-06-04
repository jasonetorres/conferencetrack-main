import '@testing-library/jest-dom'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock

// Mock crypto for JWT operations
global.crypto = {
  subtle: {
    importKey: vi.fn(),
    sign: vi.fn(),
    verify: vi.fn(),
  },
  getRandomValues: vi.fn(),
} as any