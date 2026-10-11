import { publicConfig } from './runtime'

const API_BASE_URL = publicConfig('VITE_API_BASE_URL')?.replace(/\/+$/, '') ??
  (import.meta.env.DEV ? 'http://localhost:8080' : '')

export function buildApiEndpoint(path: string) {
  const baseUrl = API_BASE_URL ?? 'http://localhost:8080'
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return `${baseUrl}${normalizedPath}`
}
