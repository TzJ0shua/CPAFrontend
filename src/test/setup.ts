import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Vitest globals are disabled, so Testing Library's implicit cleanup is unavailable.
afterEach(cleanup)

window.scrollTo = vi.fn()
