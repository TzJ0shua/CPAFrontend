import { afterEach, expect, it, vi } from 'vitest'
import { publicConfig } from './runtime'

afterEach(() => {
  delete window.__CPA_CONFIG__
  vi.unstubAllEnvs()
  vi.resetModules()
})

it('prioriza a configuração pública do contêiner sobre a do build', () => {
  vi.stubEnv('VITE_API_BASE_URL', 'https://build.example')
  window.__CPA_CONFIG__ = { VITE_API_BASE_URL: ' https://vps.example/ ' }
  expect(publicConfig('VITE_API_BASE_URL')).toBe('https://vps.example/')
})

it('mantém a configuração do Vite quando não há configuração em tempo de execução', () => {
  vi.stubEnv('VITE_API_BASE_URL', ' https://dev.example ')
  expect(publicConfig('VITE_API_BASE_URL')).toBe('https://dev.example')
  window.__CPA_CONFIG__ = { VITE_API_BASE_URL: '  ' }
  expect(publicConfig('VITE_API_BASE_URL')).toBe('https://dev.example')
})

it('usa a API da VPS nas URLs dos serviços sem duplicar barras', async () => {
  window.__CPA_CONFIG__ = { VITE_API_BASE_URL: 'https://api.example///' }
  const { buildApiEndpoint } = await import('./api')
  expect(buildApiEndpoint('/campanhas/atual/disponibilidade')).toBe('https://api.example/campanhas/atual/disponibilidade')
  expect(buildApiEndpoint('admin/cursos')).toBe('https://api.example/admin/cursos')
})
