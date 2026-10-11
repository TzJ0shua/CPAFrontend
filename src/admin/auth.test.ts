import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const client = vi.hoisted(() => ({ init: vi.fn(), updateToken: vi.fn(), clearToken: vi.fn(), authenticated: true, token: 'token', login: vi.fn(), logout: vi.fn() }))
const constructor = vi.hoisted(() => vi.fn())
vi.mock('keycloak-js', () => ({ default: class { constructor(config: unknown) { constructor(config); return client } } }))
describe('integração Keycloak', () => {
  beforeEach(() => {
    vi.resetModules(); vi.clearAllMocks(); client.authenticated = true; client.token = 'token'
    client.init.mockResolvedValue(true); client.updateToken.mockResolvedValue(true)
    vi.stubEnv('VITE_KEYCLOAK_URL', 'https://login.example'); vi.stubEnv('VITE_KEYCLOAK_REALM', 'cpa'); vi.stubEnv('VITE_KEYCLOAK_CLIENT_ID', 'cpa-frontend')
    window.history.replaceState(null, '', '/admin/cursos')
  })
  afterEach(() => { vi.unstubAllEnvs(); delete window.__CPA_CONFIG__ })
  it('usa URL, realm e cliente configurados na VPS', async () => {
    window.__CPA_CONFIG__ = { VITE_KEYCLOAK_URL: 'https://auth.vps.example', VITE_KEYCLOAK_REALM: 'vps', VITE_KEYCLOAK_CLIENT_ID: 'frontend-vps' }
    const auth = await import('./auth')
    await auth.initializeAdminAuth()
    expect(constructor).toHaveBeenCalledWith({ url: 'https://auth.vps.example', realm: 'vps', clientId: 'frontend-vps' })
  })
  it('inicializa uma única vez com PKCE e retorno para a página solicitada', async () => {
    const auth = await import('./auth')
    await Promise.all([auth.initializeAdminAuth(), auth.initializeAdminAuth()])
    expect(client.init).toHaveBeenCalledOnce()
    expect(client.init).toHaveBeenCalledWith(expect.objectContaining({ onLoad: 'login-required', flow: 'standard', pkceMethod: 'S256', redirectUri: window.location.origin + '/admin/cursos' }))
    expect(constructor).toHaveBeenCalledWith({ url: 'https://login.example', realm: 'cpa', clientId: 'cpa-frontend' })
  })
  it('renova o token antes de entregá-lo e limpa a sessão se falhar', async () => {
    const auth = await import('./auth'); await auth.initializeAdminAuth()
    await expect(auth.adminToken()).resolves.toBe('token')
    expect(client.updateToken).toHaveBeenCalledWith(30)
    client.updateToken.mockRejectedValue(new Error('offline'))
    await expect(auth.adminToken()).rejects.toThrow('sessão expirou')
    expect(client.clearToken).toHaveBeenCalledOnce()
  })
})
