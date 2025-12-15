import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Electron API
Object.defineProperty(window, 'electron', {
  value: {
    ipcRenderer: {
      invoke: vi.fn(),
      on: vi.fn(),
      send: vi.fn()
    }
  }
})
